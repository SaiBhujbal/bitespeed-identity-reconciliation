/**
 * Contact-identity reconciliation
 * ───────────────────────────────
 * • single SQL transaction  → race-free
 * • optional AI side-car    → fuzzy e-mail match
 */

import axios from 'axios';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { logger } from '../logger.js';   


/* -------------------------------------------------------------------------- */
/*  Minimal run-time representation of the Contact row.                       */
/*  Keeps us independent of Prisma’s generated type names across versions.    */
/* -------------------------------------------------------------------------- */
interface Contact {
  id: number;
  email: string | null;
  phoneNumber: string | null;
  linkedId: number | null;
  linkPrecedence: 'PRIMARY' | 'SECONDARY';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/* -------------------------------------------------------------------------- */
/*  API-layer return structure                                                */
/* -------------------------------------------------------------------------- */
export interface ConsolidatedContact {
  primary: Contact;
  emails: string[];
  phones: string[];
  secondaryIds: number[];
}

/* -------------------------------------------------------------------------- */
/*  Normalisation helpers                                                     */
/* -------------------------------------------------------------------------- */
const normEmail = (e?: string | null): string | null =>
  e?.trim().toLowerCase() ?? null;

const normPhone = (p?: string | null): string | null =>
  p?.replace(/\D/g, '') ?? null;

/* -------------------------------------------------------------------------- */
/*  Main reconciliation service                                               */
/* -------------------------------------------------------------------------- */
export async function reconcile(
  emailRaw?: string | null,
  phoneRaw?: string | null,
): Promise<ConsolidatedContact> {
  const email = normEmail(emailRaw);
  const phone = normPhone(phoneRaw);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    /* ── 1. Strict lookup (row-level lock) ─────────────────────────────── */
    let matches = (await tx.contact.findMany({
      where: {
        OR: [
          email ? { email } : undefined,
          phone ? { phoneNumber: phone } : undefined,
        ].filter(Boolean) as any[],   // avoid version-specific types
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      
    })) as unknown as Contact[];

    /* ── 2. AI fuzzy match when strict lookup fails ────────────────────── */
    if (!matches.length && email && process.env.AI_URL_SIMILAR) {
      const choices = (
        (await tx.contact.findMany({
          where: { email: { not: null }, deletedAt: null },
          select: { email: true },
        })) as { email: string | null }[]
      )
        .map((r) => r.email)
        .filter(Boolean) as string[];

      if (choices.length) {
        try {
          const { data } = await axios.get(process.env.AI_URL_SIMILAR, {
            params: { q: email, choices },
            timeout: 1_000,
          });
          const idx = (data.scores as number[]).findIndex((s) => s > 0.9);
          if (idx !== -1) {
            matches = (await tx.contact.findMany({
              where: { email: choices[idx], deletedAt: null },
              orderBy: { createdAt: 'asc' },
            })) as unknown as Contact[];
          }
        } catch (err) {
          logger.warn({ err }, 'AI service unavailable – skipping fuzzy match');
        }
      }
    }

    /* ── 3. No matches → create fresh PRIMARY ──────────────────────────── */
    if (!matches.length) {
      const primary = (await tx.contact.create({
        data: { email, phoneNumber: phone },
      })) as unknown as Contact;

      return {
        primary,
        emails: email ? [email] : [],
        phones: phone ? [phone] : [],
        secondaryIds: [],
      };
    }

    /* ── 4. Oldest row is canonical primary ────────────────────────────── */
    const [primary] = matches;

    /* ── 5. Demote duplicate primaries in set ──────────────────────────── */
    await Promise.all(
      matches
        .filter((c) => c.id !== primary.id && c.linkPrecedence === 'PRIMARY')
        .map((c) =>
          tx.contact.update({
            where: { id: c.id },
            data: { linkPrecedence: 'SECONDARY', linkedId: primary.id },
          }),
        ),
    );

    /* ── 6. Insert SECONDARY if payload adds new info ──────────────────── */
    const emailSet = new Set(
      matches.map((c) => c.email).filter(Boolean) as string[],
    );
    const phoneSet = new Set(
      matches.map((c) => c.phoneNumber).filter(Boolean) as string[],
    );

    if ((email && !emailSet.has(email)) || (phone && !phoneSet.has(phone))) {
      const created = (await tx.contact.create({
        data: {
          email,
          phoneNumber: phone,
          linkPrecedence: 'SECONDARY',
          linkedId: primary.id,
        },
      })) as unknown as Contact;

      matches.push(created);
      if (email) emailSet.add(email);
      if (phone) phoneSet.add(phone);
    }

    /* ── 7. Consolidate response ───────────────────────────────────────── */
    const secondaryIds = matches
      .filter((c) => c.linkPrecedence === 'SECONDARY')
      .map((c) => c.id);

    return {
      primary,
      emails: Array.from(emailSet),
      phones: Array.from(phoneSet),
      secondaryIds,
    };
  });
}
