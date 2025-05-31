# 🕵️‍♂️ BiteSpeed – Identity Reconciliation Service

FluxKart shoppers sometimes use a fresh e-mail address or phone number for
every order. BiteSpeed’s CRM must still recognise the human behind the aliases.
This micro-service exposes a single **`POST /identify`** endpoint which:

* locates / creates the appropriate **`Contact`** rows
* consolidates them into one “identity graph”
* returns the graph in the format BiteSpeed expects

---

## Table of contents
1. [Quick start](#quick-start)
2. [Project structure](#project-structure)
3. [Environment variables](#environment-variables)
4. [API reference](#api-reference)
5. [Local development](#local-development)
6. [Tests & linters](#tests--linters)
7. [Deployment (Render.com)](#deployment-rendercom)
8. [Road-map](#road-map)

---

## Quick start

```bash
# clone & run
git clone https://github.com/SaiBhujbal/bitespeed-identity-reconciliation.git
cd bitespeed-identity-reconciliation
cp .env.example .env                    # adjust if you like, defaults work
docker compose up -d                    # api:3000  db:5432  ai:8000
docker compose exec api npx prisma db push   # ⚠️  run ONCE to create tables
````

### First request

```bash
curl -X POST http://localhost:3000/identify \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber":"123456"}'
```

```json
HTTP/1.1 200 OK
{
  "contact": {
    "primaryContatctId": 1,
    "emails": [],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

---

## Project structure

```
.
├─ ai-service/            # FastAPI demo for fuzzy e-mail similarity
├─ prisma/                # schema.prisma + SQL migrations
├─ src/                   # TypeScript source (Express 5)
│  ├─ app.ts
│  ├─ routes/identify.ts
│  └─ services/contactService.ts
├─ tests/                 # Jest + SuperTest
├─ Dockerfile             # multi-stage build (build + runtime)
├─ docker-compose.yml     # api, postgres, ai-service
└─ .github/workflows/ci.yml
```

---

## Environment variables

| Variable         | Default                                          | Description                                       |
| ---------------- | ------------------------------------------------ | ------------------------------------------------- |
| `DATABASE_URL`   | `postgres://postgres:postgres@db:5432/bitespeed` | Postgres connection string                        |
| `AI_URL_SIMILAR` | `http://ai-service:8000/similar`                 | Optional fuzzy-match endpoint                     |
| `LOG_LEVEL`      | `info`                                           | Pino log level (`debug`, `info`, `warn`, `error`) |

Copy **`.env.example`** → **`.env`** and override any value.

---

## API reference

### `POST /identify`

| Field         | Type     | Notes                 |
| ------------- | -------- | --------------------- |
| `email`       | string ? | Nullable              |
| `phoneNumber` | string ? | Digits only, nullable |

#### Successful response `200 OK`

```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["primary@e.mail", "alias@e.mail"],
    "phoneNumbers": ["123456", "987654"],
    "secondaryContactIds": [23, 42]
  }
}
```

#### Error `400 Bad Request`

```json
{ "error": "At least one of email or phoneNumber must be provided." }
```

### `GET /metrics`

Prometheus counters & histograms (exposed by `prom-client`).

---

## Local development

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init   # creates tables locally
npm run dev                          # nodemon + ts-node
```

Open [http://localhost:3000/identify](http://localhost:3000/identify) in Postman (JSON body only).

---

## Tests & linters

```bash
npm test        # Jest + SuperTest
npm run lint    # ESLint strict config
npm run build   # TypeScript type-check (noEmit=false)
```

Coverage: 100 % on the reconciliation service.

---

## Deployment (Render.com)

1. **Blueprint deploy** → choose this repo (Docker).
2. Add Render Postgres add-on → it fills `DATABASE_URL`.
3. First deploy builds the image, runs `docker compose up`, health-checks
   `/metrics`, and your service is live at

   ```
   POST https://bitespeed-api-vfyh.onrender.com/identify
   ```

---

## Road-map

* ✅ initial spec (create / merge / demote contacts)
* 🔐 OpenTelemetry tracing
* 🚀 rate-limit by IP with Redis
* 🐳 multi-arch (arm64) Docker build

---

## Author

**SAI BHUJBAL** — *https://www.linkedin.com/in/sai-bhujbal/*

---

MIT License © 2025
