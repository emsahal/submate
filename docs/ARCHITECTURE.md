# Architecture

## Overview

Subly is an npm-workspaces monorepo with three logical parts:

```
Subly/
├── shared/          # types.ts — API contract shared by both apps
├── frontend/        # Next.js 16 (App Router, React 19, Tailwind v4)
└── backend/         # Hono (Node), Drizzle ORM, Better Auth, Neon
```

The frontend talks to the backend through a typed JSON client (`frontend/src/lib/api.ts`) at `BACKEND_URL` (default `http://localhost:3001`). Authentication cookies (`httpOnly`, `sameSite: lax`) are sent with `credentials: "include"`.

## Frontend

- **App Router** pages under `frontend/src/app/`:
  - Marketing / SEO: `/`, `/subscriptions`, `/categories`, `/blog`, `/faq`, `/about`, `/contact`, `/privacy`, `/terms`, `/refund-policy`
  - Customer: `/auth`, `/dashboard/*` (overview, orders, subscriptions, notifications, profile)
  - Admin: `/admin/*` (protected — non-ADMIN users are redirected)
- **`proxy.ts`** (Next 16 middleware) handles route protection via `getSessionCookie` for cookie-only checks.
- **UI** is shadcn-style: Radix primitives + `cva` variants under `frontend/src/components/ui/`, plus `lucide-react`, `sonner`, `next-themes`, `date-fns`.
- **Design tokens** live in `frontend/src/app/globals.css` (`@theme inline`), primary deep teal `#0F766E`, fonts Lexend (headings) + Source Sans 3 (body), with dark mode via a `.dark` class.
- **SEO**: per-route metadata, `sitemap.ts` + `robots.ts` (dynamic, query the backend), and JSON-LD (`Organization` in the root layout, `Product`/`AggregateOffer` on product pages).

## Backend

Entry: `backend/src/index.ts` → `backend/src/app.ts` mounts:

| Mount | Purpose |
| --- | --- |
| `/api/auth/*` | Better Auth handler (Google OAuth, sessions) |
| `/api/public/*` | Catalog, blog, FAQs, reviews, health |
| `/api/me/*` | Customer profile, orders, payments, subscriptions, notifications |
| `/api/admin/*` | Everything admin (stats, payments, orders, subscriptions, products, content, users, settings, audit logs) — `requireAdmin` guard |
| `/api/cron/*` | Internal expiry job (guarded by `CRON_SECRET`) |

Key layers:

- `src/db/schema.ts` — 21 tables + enums (products, plans, categories, orders, payments, payment_screenshots, subscriptions, access_credentials, subscription_slots, notifications, reviews, blog_posts, faq_items, payment_methods, settings, audit_logs, admin_actions, users, accounts, sessions, verification)
- `src/services/` — domain logic: orders, payments, subscriptions, expiry, catalog, admin, reviews, notifications
- `src/ai/nvidia.ts` — screenshot analysis via NVIDIA NIM vision model
- `src/storage/neon-bucket.ts` — S3-compatible uploads + presigned URLs
- `src/lib/crypto.ts` — AES-256-GCM for access credentials
- `src/rate-limit/` — per-route rate limiting (in-memory by default, Upstash optional)
- `src/lib/audit.ts` — audit log + admin action trail

## Order / payment lifecycle

```
PENDING_PAYMENT ──submit screenshot──▶ PAYMENT_SUBMITTED ──AI background──▶ UNDER_ADMIN_REVIEW
     │                                                          │
     └─ expire (cron, pendingExpiryHours)                       ▼
                                                        admin decision
                                      ┌─────────────────┬───────────────┬──────────────┐
                                      ▼                 ▼               ▼              ▼
                                   APPROVED        REJECTED      REQUEST_REUPLOAD    (stays)
                                      │
                          fulfill (admin)
                                      ▼
                                 FULFILLED ─▶ subscription created (ACTIVE)
```

- AI analysis never auto-approves: on success the payment becomes `AI_REVIEWED` with `aiStatus`/`aiConfidence`/`aiResult`, and the order enters `UNDER_ADMIN_REVIEW`. On AI failure, `aiError` is recorded and admins are notified to verify manually.
- Admin decisions (`APPROVE` / `REJECT` / `REQUEST_REUPLOAD`) are the source of truth. Approving a payment moves the order to `APPROVED`; an admin then **fulfills** it to create the subscription.
- Screenshots are stored in Neon object storage; metadata (bucket, object key, sha256, size) is kept in `payment_screenshots`.

## Subscriptions

- Status is **derived from dates** (ACTIVE / EXPIRING_SOON ≤7d / EXPIRED) plus explicit SUSPENDED / CANCELLED states.
- Delivery credentials are encrypted at rest (`access_credentials.encryptedPayload` + IV + key version) and only revealed to the customer through their dashboard.
- Renewals extend expiry from `max(previous expiry, today)`.

## Notifications & expiry

- `src/services/expiry.ts` runs a deduplicated job (7/3/1-day + expired) — trigger via `npm run cron:expiry` or a scheduler hitting `/api/cron/expiry` with `CRON_SECRET`.
- `src/services/notifications.ts` writes in-app notifications and notifies admins (deduped) about new/submitted payments, AI failures, and broadcast messages.

## Data access & security

- All write paths validate with Zod (`src/validation/`) and server-side prices are recomputed (never trusted from the client).
- Order/payment/subscription lookups are ownership-scoped for customers; admins use unscoped services.
- Privileged actions write to `audit_logs` (immutable trail) and `admin_actions`.
