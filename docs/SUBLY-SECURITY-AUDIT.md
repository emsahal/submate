# SUBLY SECURITY AUDIT

**Date:** 2026-08-13
**Scope:** Full codebase review of the Subly/SubMate monorepo (`frontend/` Next.js, `backend/` Hono, `shared/`, `docs/`) plus live-site analysis of the production domain `submate.tech` (owner-confirmed). `subly.tech` was also fetched during review but is a different company's unrelated site.
**Motivation:** Google Search Console reported **"Deceptive pages"** on `submate.tech` (Sample URLs: N/A).

---

## 1. Executive Summary

The codebase is a legitimate, well-built subscription marketplace (repo folder named `Subly`, deployed brand **SubMate**). No injected malware, no link spam, no hidden SEO text, no crypto miners, no phishing pages were found in repository code or in the live rendered HTML of the production domain `submate.tech` — the deployed build matches this repo byte-for-byte (title/meta/JSON-LD from `frontend/src/config/site.ts` + `layout.tsx`, navbar, sections, products, WhatsApp/email all identical to source).

Audit verdict: **There is no evidence of a technical compromise, injected deceptive content, on-page phishing, or cloaking on `submate.tech`.** The flag therefore almost certainly stems from product/policy optics rather than infection: the shared-account resale model with a Gmail-based OTP handoff, manual JazzCash/Easypaisa/bank transfer payments with screenshot upload, and a trail of legacy "Subly" branding still present on the live site. Several genuine security defects were nevertheless found; the most salient are the **Gmail OAuth flow missing `state`/PKCE (CSRF risk)** and the **blog stored-XSS surface**.

Live HTML review found **zero** injected third-party scripts, zero redirects, zero obfuscation on `submate.tech`. (Note: `subly.tech` serves an unrelated software-consulting company — not this app.)

Findings are categorized A–K; severities: 0 Critical, 2 High, 6 Medium, 6 Low, plus confirmations.

---

## 2. Methodology

- Static review of all backend routes/services/middleware/storage/db-schema and all frontend pages/components/layouts used in the client flows.
- Environment/secret hygiene review (`.env.example`, `.gitignore`, git history 31 commits, `.vercel/project.json`).
- Static pattern searches: `eval`, `new Function`, `atob`/`btoa`/`base64`, `innerHTML`, `document.write`, `window.location`, `dangerouslySetInnerHTML`, injected script/iframe sources, `.onion`, crypto-miner signatures.
- Live fetch + source analysis of `https://subly.tech` and `https://submate.tech` (rendered HTML, all `<script src>` domains, redirects, branding).
- Authorization/ownership logic review (subscription, order, payment, OTP, admin, Gmail token flows).

---

## 3. Root-Cause Analysis: Why Google Might Say "Deceptive Pages"

### 3.1 Confirmed: production site is clean
- `submate.tech` (owner-confirmed domain) serves the exact build of this repo. Title, description, keywords, OG tags, canonical, both JSON-LD blocks, navbar, sections, product lineup, WhatsApp (`wa.me/923149466389`), and email (`support@submate.tech`) all match source.
- **No** injected scripts, iframes, meta-refresh, `window.location` abuse, base64 blobs, obfuscation, SEO-spam text, crypto-miner signatures, or third-party trackers on the live page. All 20+ `<script src>` are self-hosted `/_next/static/...` chunks.
- So the "Deceptive pages" verdict is **not** the result of a compromised/hacked page or hidden injected content.

### 3.2 Flags the live site carries (Category A — what a reviewer/crawler could flag)
- **Legacy "Subly" branding still live.** The homepage literally renders a browser-mockup URL bar showing **`subly.pk/dashboard`** (hardcoded in `frontend/src/app/page.tsx`), and all product logos load from a Neon bucket path containing `subly-imgs/`. Combined with brand **"SubMate"** on `submate.tech`, this mismatch can be read as an inconsistent/shadow presence. This is the single most concrete, fixable on-page issue.
- **Shared-account resale optics.** Products are shared/family accounts (e.g., 4-profile Netflix) resold for PKR, with "Verified" badges and provider logos (Netflix/Spotify/…) next to a "not an official reseller" disclaimer. Automated policy review can interpret this as impersonating official subscription services.
- **Gmail OTP handoff.** The app connects a human Gmail mailbox (admin-only, official Google OAuth) that receives Netflix verification codes; customers request the latest OTP for their subscription (`otpRequest` → `fetchLatestNetflixOtpCode`). The pattern "customer asks site for a login/verification code" is a classic phishing signature, even though here it is legitimate and admin-only on the connection side.
- **Manual payment + screenshot upload.** JazzCash/Easypaisa/bank-transfer payment instructions with a request to upload the transaction screenshot overlaps Google's heuristics for "convincing but unofficial" payment flows.

### 3.3 Why "Sample URLs: N/A"
With no specific sample URLs cited, the flag is domain-wide and algorithmic — consistent with a site-wide policy-classification (business-model heuristics) rather than a specific hacked/injected page. The fix path is §8: clean up legacy branding, make the business model's terms explicit, harden security, and request re-review.

### 3.4 No evidence of compromise
- No obfuscated JS, no injected iframes/redirects/refreshes, no third-party trackers in code or in the live HTML.
- No secrets in git; `.env` excluded.
- Git history shows only feature/UI work; no suspicious commits.

---

## 4. Finding Inventory (Severity-ranked)

| # | Severity | Category | Title |
|---|----------|----------|-------|
| F-01 | **High** | C | Gmail OAuth callback lacks `state`/PKCE — OAuth login CSRF can replace the authorized mailbox |
| F-02 | **High** | G | Stored XSS via blog markdown rendered with `dangerouslySetInnerHTML` (`marked.parse`) |
| F-03 | **Medium** | E | OTP codes and Gmail settings stored/replayed in plaintext-adjacent surfaces; no expiry enforcement concerns beyond TTL |
| F-04 | **Medium** | H | No CSP/security headers in `frontend/next.config.ts` (empty config); backend has `secureHeaders()` |
| F-05 | **Medium** | C | No frontend middleware → admin/dashboard pages ship client-side-gated UI only; data APIs are server-gated (OK), page HTML is public |
| F-06 | **Medium** | D | Access-credential and screenshot objects rely on presigned URLs (1h); expiry good, but customer-facing `viewedUrl` on payment is broad |
| F-07 | **Medium** | A | Hardcoded legacy brand strings (`subly.pk`, `Subly Payments`) cause brand/domain inconsistency that can read as deceptive linking |
| F-08 | **Medium** | F | OTP retrieval from a single shared mailbox: any customer's request returns the *latest* code for any account on that mailbox (cross-subscription leak window) |
| F-09 | **Low** | C | Google OAuth failure messages are surfaced raw into redirect queries (`reason=`), leaking error strings to query logs |
| F-10 | **Low** | D | `isSuspended`/`role` enforced server-side (good), but role is not re-validated at every route boundary separately from session (single source, fine) — informational |
| F-11 | **Low** | H | CORS `origin.endsWith(".vercel.app")` is broad (any Vercel deployment) |
| F-12 | **Low** | J | `sitemap.ts`/`robots.ts` fall back to `localhost:3000` when `NEXT_PUBLIC_APP_URL` unset → potential accidental indexing of localhost URLs |
| F-13 | **Low** | I | `.env.example` contains real-shaped names + personal admin email; fine, but remove personal email |
| F-14 | **Low** | E | Screenshot upload validated client-side + MIME server-side; no server-side pixel/depth checks (informational) |

**Confirmed-good:** server-side role enforcement, ownership checks on order/subscription routes, AES-256-GCM encrypted row-level secrets, presigned short-lived URLs, Better-Auth session handling, API rate limiting (5/min) + 3/day OTP quotas, robots.txt disallowing `/api /admin /dashboard /auth`, no secrets committed, only self-hosted scripts in prod builds.

---

## 5. Detailed Findings

### F-01 (High, C) — Gmail OAuth callback: no `state`, no PKCE
**Files:** `backend/src/routes/gmail.ts`, `backend/src/services/gmail.ts`
The callback `GET /oauth/gmail/callback` reads `code`/`error`/`state` but **never generates or validates `state`**, and the authorize URL (`buildGmailAuthorizeUrl`) sets no `state` and no PKCE `code_challenge`. Google's consent flow is `access_type=offline` — the response contains a long-lived refresh token.

**Impact:** Classic OAuth CSRF / connection-replacement. An attacker who can get the admin's browser to visit `…/oauth/gmail/callback?code=<attacker-code>` (attacker runs their own Gmail consent flow, captures their own authorization code, then lures admin to the callback URL) replaces the stored `settings.gmailOtp` refresh token with the attacker's account. Result: the app's OTP mailbox silently becomes the attacker's inbox → all customer OTP requests are read from an attacker-controlled mailbox (or the flow breaks), and the originally connected mailbox is evicted. Also enables set-mapping surprises and token theft via referer/log leakage of the authorization code.

**Fix:** generate a random `state` stored in an HttpOnly cookie before redirecting to Google; validate + clear it in the callback. Add PKCE (`code_challenge`/`code_verifier`) when possible. Validate `profile.emailAddress` belongs to the admin allowlist before persisting. Mark `scope:gmail.readonly` as minimal (already minimal).

### F-02 (High, G) — Stored XSS in blog via `marked.parse` + `dangerouslySetInnerHTML`
**Files:** `frontend/src/app/blog/[slug]/page.tsx:36` (`marked.parse(post.content || "")` → `dangerouslySetInnerHTML`), `frontend/src/app/admin/blog/[id]/page.tsx` (authoring), `backend/src/routes/admin.ts`/`db/schema.ts`.
Blog content is admin-written markdown, but `marked.parse` outputs raw HTML for any inline HTML in the source and the result is injected without sanitization. If admin content ever includes user-influenced markdown, or any admin account is compromised, stored XSS executes in every visitors' session (session cookies, CSRF, credential harvesting). Seed content (`scripts/seed.ts`) is plain markdown and safe today.

**Fix:** sanitize rendered HTML server- or client-side (`DOMPurify` / `marked` + eslint-disable rules like `@shikijs`/sanitize-html), or configure `marked` to escape raw HTML, and tighten CSP (see F-04). Treat post body as untrusted input regardless of authorship.

### F-03 (Medium, E) — OTP codes in plaintext DB; shared-mailbox replay window
**Files:** `backend/src/services/otp.ts`, `db/schema.ts` (`otpRequests.code`), `backend/src/services/gmail.ts`.
OTP codes are stored unencrypted in `otpRequests` and served to the requesting user. Combined with F-08, codes from the shared inbox are short-lived but undifferentiated across accounts. Encryption of stored codes (transient, TTL already 10 min) and normalization/redaction in logs is recommended.

### F-04 (Medium, H) — No CSP / security headers in frontend
**Files:** `frontend/next.config.ts` (empty), `frontend/src/app/layout.tsx` (JSON-LD via `dangerouslySetInnerHTML`), `backend` `secureHeaders()`.
The Next.js app ships no `Content-Security-Policy`, no `X-Frame-Options`/frame-ancestors (page could be framed/clickjacked over the admin flows), no `Referrer-Policy` hardening. The backend does apply `secureHeaders()`. Add per-route or global headers in `next.config.ts`, at minimum a strict CSP with `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`.

### F-05 (Medium, C) — Frontend authorization without middleware
**Files:** no `frontend/src/middleware.ts`; `frontend/src/app/admin/layout.tsx`, `frontend/src/app/dashboard/layout.tsx`.
Admin/dashboard UI gating is client-side; data is safe because all backend routes enforce `requireUser`/`requireAdmin`. Risk is informational exposure of layout/HTML structure and weaker UX-enforced bound. Recommendation: add a Next middleware edge check (or rely on server components + `session()` calls in layouts) so admin routes return 404/redirect before hydration.

### F-06 (Medium, D) — Presigned URL scope
**Files:** `backend/src/services/payments.ts:242` (`viewedUrl: await presignedReadUrl(s.objectKey)`), `backend/src/storage/neon-bucket.ts`.
Object URLs expire in 1 hour — good. Ensure presigned URLs are never embedded in rendered HTML (only returned via authenticated API calls) and that keys include `userId` so no cross-tenant guesses. Verify bucket policy is private.

### F-07 (Medium, A) — Legacy brand strings live on the deployed site
**Files:** `frontend/src/app/page.tsx` (`subly.pk/dashboard` browser-mockup — confirmed in live HTML of submate.tech), Neon bucket image paths (`subly-imgs/` — confirmed live), `backend/scripts/seed.ts` (`Subly Payments`, `seoTitle … | Subly`), `.env.example`.
Brand (SubMate), domain (submate.tech), and folder/legacy naming (Subly) disagree, and the Subly strings are actually rendered on the production homepage. For human policy reviewers and crawlers this reads as an inconsistent/shadow presence. Unify to SubMate (`Subly Payments`, mockup URL) and correct the bucket image path or accept it as a CDN-only artifact.

### F-08 (Medium, F) — Shared-mailbox OTP cross-subscription leak window
**Files:** `backend/src/services/otp.ts` + `gmail.ts` (`fetchLatestNetflixOtpCode`).
`fetchLatestNetflixOtpCode` queries `from:@netflix.com OR subject:"verification code" ...` and returns the newest code mailbox-wide during the last 3 days. When two customers of *different* accounts both request codes in the same window, the "latest" code can belong to the other customer's account. There is 3/day and 5/min limiting, so blast radius is bounded, but uniqueness-per-request isn't guaranteed.

**Fix options:** track last-served message IDs per subscription; tag outgoing code with `messageId`; reject repeating the same code for another subscription; increase mailbox-poll scoping.

### F-09 (Low, C) — Error strings into redirects
`gmail.ts` callback redirects with `reason=${encodeURIComponent(reason)}` where `reason` is the raw thrown error (`err instanceof Error ? err.message : …`). Coaxing Google/Gmail API errors into URLs can leak internal implementation details to logs/proxies. Redact to stable error codes.

### F-10 (Low, D) — Role revalidation (informational)
`requireAdmin` checks `role` from the session, which is set server-side at login and stored in the DB (Better-Auth default). Fine; note it in case sessions are long-lived and roles change — consider revoking on role change.

### F-11 (Low, H) — Broad CORS origin
Backend default allowlist includes `origin.endsWith(".vercel.app")`. Any hobby Vercel deployment (attacker-controlled) is a permitted cross-origin reader *with* credentials if cookies are included. Credentials cross-origin are still gated by SameSite cookie policy and `credentials:"include"` choices, and the site cookie is `SameSite=Lax` (Better Auth default) — practical exploit is limited, but tighten the list to explicit origin strings.

### F-12 (Low, J) — Sitemap fallback
`frontend/src/app/sitemap.ts` and robots use `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`). If the env var is missing on Vercel, sitemap advertises localhost URLs. Set the env var explicitly; also confirm `SITE_URL` in `backend/src/config.ts` matches the production frontend.

### F-13 (Low, I) — Personal admin email in `.env.example`
`ADMIN_EMAILS=sarcasticsahal@gmail.com` and the chat/FAQ knowledge base (`.opencode…`, `chat-widget.tsx`, `ai/chat.ts`) expose a personal Gmail address and personal WhatsApp as official support channels — weakens trust/impersonation optics and leaks personal identity in seed docs. Replace with a role mailbox; add `data/` FAQ entries without personal identifiers if this is production posture.

### F-14 (Low, E) — Upload validation informational
Screenshot upload enforces content type/extension/size client & server-side. No server-side image re-encoding; a polyglot image with appended payload is stored but never rendered as HTML downstream (only presigned download), so risk is minor. Optional: re-encode images server-side.

---

## 6. Root-Cause Category Map (A–K)

- **A. Deceptive-content/impersonation optics** — F-07 (legacy branding live on site) + business model §3.2
- **B. Brand & domain inconsistency** — §3.2 (SubMate brand vs legacy Subly strings on live page)
- **C. Authentication flow flaws** — F-01, F-05, F-09
- **D. Authorization / IDOR** — F-06, F-10 (ownership checks otherwise solid)
- **E. Data protection at rest/in transit** — F-03, F-14
- **F. Abuse / rate-limit / quota gaps** — F-08
- **G. Input handling / XSS** — F-02
- **H. Headers / CSP / CORS** — F-04, F-11
- **I. Secrets & config hygiene** — F-13
- **J. SEO / indexing config** — F-12
- **K. Supply chain / third-party scripts** — NONE found (clean); add `npm audit` + lockfile verify to CI.

---

## 7. What Passed (Why the Page Is Unlikely "Hacked")

- No injected scripts, iframes, meta-refresh, `window.location` abuse, base64 blobs, or obfuscation in either live site HTML or repo source.
- No spam content, hidden text, or doorway pages in robots/sitemap/marketing copy.
- Auth, sessions, roles, encrypted secrets, short-lived presigned URLs, and rate limiting are implemented competently server-side.
- Git history clean; `.env` not committed.

---

## 8. Google Search Console — Fix & Re-request Review

1. **Confirm the property**: `submate.tech` is owner-verified in Search Console and is the flagged property. (The unrelated `subly.tech` consulting site is not this app — do not treat it as the fix target.)
2. **Remove live legacy branding**: the rendered homepage shows a mockup URL bar `subly.pk/dashboard` and products load from a `subly-imgs` bucket path. Replace with SubMate-branded strings/URLs wherever they appear on the live site.
3. **Unify brand/domain** everywhere — metadata, contact, seed (`Subly Payments`, `seoTitle … | Subly`), JSON-LD, sitemap, `.env`. Set `NEXT_PUBLIC_APP_URL` to the production public URL.
4. **Remove personal-identity touchpoints** (sarcasticsahal@gmail.com, personal WhatsApp) from all support/FAQ/AI copy; use a domain-branded mailbox and show explicit "independent marketplace, not affiliated with Netflix/Google/etc." disclaimers near payment and OTP flows.
5. **Harden product-level optics**: avoid "Verified" badges implying provider affiliation; be explicit that access is a shared-profile slot on an account the user does not own.
6. **Fix F-01 (state/PKCE)**, F-02 (sanitize blog), F-04 (CSP), then redeploy.
7. In Search Console: re-enable "Submit for review", supply a summary explaining the business model, MX/verification tokens for `submate.tech` used in outbound email, and note there is no redirect, phishing, or cloaking; mention the legacy Subly→SubMate rebrand if the verifier asks.

---

## 9. Detected Threat / Risk Register Summary

| Risk | Before | After (recommended) |
|---|---|---|
| Gmail mailbox takeover via OAuth CSRF | High | Mitigated with state+PKCE |
| Stored XSS (blog, admin-authored) | High | Sanitize + CSP |
| Cross-subscription OTP window | Medium | Per-subscription de-dup / messageId tracking |
| Brand/domain deceptive optics | Medium | Unify branding & disclosures |
| Data-at-rest OTP plaintext | Medium | Encrypt/redact + shorter TTL |
| CSP/header absence | Medium | Add headers |
| CORS over-permissive | Low | Explicit origins |
| Personal PII in support copy | Low | Role mailbox |

---

## 10. Recommended Remediation Priority

1. Blocking (do now): F-01, F-02, F-07-page/subly.pk strings, unify domain config (F-12), remove personal emails (F-13).
2. High value: F-03, F-04, F-08.
3. Hygiene: F-05, F-06, F-09, F-11, F-14.

---

## 11. Appendix — Files & Surfaces Reviewed

- Backend: `src/routes/*` (public, account, admin, gmail, cron), `src/middleware/auth.ts`, `src/services/{otp,gmail,payments,subscriptions,orders,admin,email,notifications,expiry}.ts`, `src/storage/neon-bucket.ts`, `src/lib/{crypto,settings,audit,errors}.ts`, `src/ai/{chat,nvidia}.ts`, `src/db/schema.ts`, `src/auth/index.ts`, `src/config.ts`, `scripts/{seed,expiry-job,env-check,questions}.ts`.
- Frontend: `app/layout.tsx`, `app/page.tsx`, `app/auth/page.tsx`, `app/dashboard/*`, `app/admin/*`, `app/subscriptions/*`, `app/categories/[slug]`, `app/blog/*`, `app/faq`, `app/contact`, `privacy`, `terms`, `refund-policy`, `app/chat-widget.tsx`, all `components/*`, `lib/{api,auth-client,site-data,format}.ts`, `config/site.ts`, `next.config.ts`, `robots.ts`, `sitemap.ts`, `public/`.
- Ops: `.env.example`, `.gitignore`, `.vercel/project.json`, `package.json` (×3), `docs/ARCHITECTURE.md`, git history.
- Live: `https://submate.tech` (owner-confirmed, rendered HTML + asset source analysis). `https://subly.tech` fetched for comparison — unrelated business, not this app.