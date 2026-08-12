# Operations

## Environment setup

Copy `.env.example` to `.env` and set at minimum:

| Variable | Why |
| --- | --- |
| `DATABASE_URL` | Backend refuses to start without it |
| `AUTH_SECRET` | Better Auth session signing; generate with `openssl rand -base64 32` |
| `CREDENTIALS_ENCRYPTION_KEY` | Used to derive the AES-256-GCM key for access credentials; generate with `openssl rand -base64 32`. Changing it after data exists makes stored credentials unreadable. |

Optional but needed for features to function:

- **Google login**: create an OAuth 2.0 client in Google Cloud Console; set `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` and add the redirect URI `http://localhost:3001/api/auth/callback/google` (production: your backend URL).
- **AI screenshot analysis**: grab an API key from https://build.nvidia.com and set `NVIDIA_API_KEY` (model: `NVIDIA_VISION_MODEL`).
- **Screenshot storage**: create a Neon Object Storage bucket, then set `AWS_ENDPOINT_URL_S3`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEON_STORAGE_BUCKET`.

## Database

```bash
npm run db:generate   # new migration after schema changes
npm run db:migrate    # apply migrations
npm run db:seed       # idempotent sample data (categories, methods, products, FAQs, blog)
```

For local prototyping you can also use `npm run db:push` (schema-first, no migration files) — prefer migrations for shared/staging environments.

## Running

- Development: `npm run dev` (backend `:3001`, frontend `:3000`).
- Production: `npm run build` then run `npm run start:backend` and `npm run start:frontend` (or deploy to Vercel/Render/EC2).
- The backend validates its required env vars on boot and logs what's missing.

## Scheduled jobs

Run the expiry job on a schedule (e.g. every 6 hours):

```bash
npm run cron:expiry
```

The same job is exposed at `GET /api/cron/expiry` and must be called with `?token=<CRON_SECRET>` (or `x-cron-secret` header). It:

- Marks orders past their `expiresAt` as `EXPIRED` if still pending payment.
- Sends deduplicated expiry notifications at 7 / 3 / 1 days before expiry and on expiry, per the notifications settings.

## Admin accounts

Emails listed in `ADMIN_EMAILS` (comma-separated) are auto-promoted to `ADMIN` on their first Google sign-in (see `databaseHooks.user.create.after` in `backend/src/auth/index.ts`). You can also promote/demote users from **Admin → Users**.

## Security notes

- Keep `.env` out of version control (it's gitignored). Use your platform's secret manager in production.
- `CREDENTIALS_ENCRYPTION_KEY` rotation invalidates previously stored access credentials — rotate only when you also plan to re-enter credentials.
- Payment review is always human-decided; the AI output is advisory and failures fall back to manual review with admin notification.
- Rate limits are in-memory by default. For multi-instance deployments set `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` to share the limiter.
- List products only where provider terms, licensing, and local law permit; Subly makes no official-reseller claims.

## Common issues

- **Backend exits with "DATABASE_URL is missing"** — you haven't set `.env`.
- **Sign-in fails** — Google credentials missing or redirect URI not registered.
- **Uploads fail** — storage env vars unset, bucket missing, or endpoint/region mismatch.
- **`db:seed` says product already exists** — seed is idempotent; it skips duplicates by slug.
