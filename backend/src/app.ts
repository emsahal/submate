import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { auth } from "./auth/index.js";
import { publicRoutes } from "./routes/public.js";
import { accountRoutes } from "./routes/account.js";
import { adminRoutes } from "./routes/admin.js";
import { gmailRoutes } from "./routes/gmail.js";
import { cronRoutes } from "./routes/cron.js";
import { ApiError, toApiError } from "./lib/errors.js";

const app = new Hono();

const defaultOrigins = [
  "http://localhost:3000",
  "https://submate.tech",
  "https://www.submate.tech",
  "https://submate-frontend.vercel.app",
];

const envOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const frontendOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return origin;
      if (frontendOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        return origin;
      }
      return frontendOrigins[0] ?? "https://submate.tech";
    },
    allowHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 600,
  }),
);

app.onError((err, c) => {
  const apiError = err instanceof ApiError ? err : toApiError(err);
  if (!(err instanceof ApiError)) {
    console.error("[api] unhandled error", err);
  }
  const extra = apiError.details !== undefined ? { details: apiError.details } : {};
  return c.json({ error: { code: apiError.code, message: apiError.message }, ...extra }, apiError.status as ContentfulStatusCode);
});

app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Resource not found." } }, 404));

/* Better Auth handles everything under /api/auth/... */
app.all("/api/auth/*", (c) => auth.handler(c.req.raw));

app.route("/api", publicRoutes);
app.route("/api", accountRoutes);
app.route("/", gmailRoutes);
app.route("/api/admin", adminRoutes);
app.route("/api/cron", cronRoutes);

app.get("/", (c) => c.json({ service: "subly-backend", status: "ok" }));

export default app;