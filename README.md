# Subly

**Digital subscriptions, simplified for Pakistan.**

Subly is a subscription marketplace where customers discover eligible digital subscription plans, pay with local methods (Easypaisa / JazzCash / bank transfer), upload payment screenshots, and get their orders verified by an AI-assisted admin review workflow. Subscriptions are delivered with encrypted credentials and expiry notifications keep customers in the loop.

- **Frontend** — Next.js 16 (App Router, React 19, Tailwind v4) in `frontend/`
- **Backend** — Node.js + Hono + Drizzle ORM (Postgres on Neon) in `backend/`
- **Shared** — `shared/types.ts` (API contract used by both apps)

## Requirements

- Node.js 20+ (built and tested on Node 24)
- A Neon Postgres database (or any Postgres)
- Optional: Google OAuth client, NVIDIA NIM API key, Neon Object Storage bucket

## Setup

```bash
# 1. Install dependencies (npm workspaces)
npm install

# 2. Configure environment
cp .env.example .env
#   → fill in DATABASE_URL (required), AUTH_SECRET, CREDENTIALS_ENCRYPTION_KEY
#   → optional: GOOGLE_CLIENT_ID/SECRET, NVIDIA_API_KEY, NEON storage creds

# 3. Generate + apply migrations, then seed sample data
npm run db:migrate
npm run db:seed

# 4. Run both apps (frontend :3000, backend :3001)
npm run dev
```

Open http://localhost:3000. The backend health check is at http://localhost:3001/api/public/health.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Run backend + frontend concurrently |
| `npm run build` | Production build of both apps |
| `npm run typecheck` | TypeScript checks for both apps |
| `npm run lint` | Lint both apps |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:push` | Push the schema directly (dev only) |
| `npm run db:seed` | Seed categories, payment methods, products, FAQs, blog |
| `npm run cron:expiry` | Run the expiry-notification job once |

## Who it's for

- **Customers** sign in with Google, browse the catalog, choose a plan, pay via a local method, upload a screenshot, and track their order through verification to fulfilment.
- **Admins** review payments (with AI hints but the final human call), fulfil orders into subscriptions, deliver encrypted credentials, renew/suspend/cancel subscriptions, and manage products, plans, categories, blog posts, FAQs, users, reviews, settings, and broadcasts — every privileged action is written to an audit log.

## Environment variables

See `.env.example` for the full list with instructions. Key ones:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Neon Postgres connection string |
| `AUTH_SECRET` | Yes | Better Auth signing secret (≥32 chars) |
| `CREDENTIALS_ENCRYPTION_KEY` | Yes | 32-byte base64 key for AES-256-GCM credential encryption |
| `ADMIN_EMAILS` | No | Comma-separated emails auto-promoted to ADMIN |
| `GOOGLE_CLIENT_ID/SECRET` | No* | Google OAuth login (*required for sign-in to work) |
| `NVIDIA_API_KEY` | No | Payment screenshot AI analysis (NVIDIA NIM) |
| `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEON_STORAGE_BUCKET` | No | Screenshot uploads to Neon object storage |
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BACKEND_URL`, `NEXT_PUBLIC_SUPPORT_EMAIL` | No | Public URLs used by the frontend |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — folder structure, data model, order/payment lifecycle
- [Operations](docs/OPERATIONS.md) — deployment, cron jobs, security notes

## License

Private / proprietary. See the project owner for licensing.
