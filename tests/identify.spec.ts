import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/db.js';

beforeAll(() => prisma.$connect());
afterAll(() => prisma.$disconnect());

describe('/identify', () => {
  it('creates a new primary when none exists', async () => {
    const res = await request(createApp())
      .post('/identify')
      .send({ phoneNumber: '9876543210' });

    expect(res.status).toBe(200);
    expect(res.body.contact.secondaryContactIds.length).toBe(0);
  });
});
