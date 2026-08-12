import { Hono } from "hono";
import { runExpiryJob } from "../services/expiry.js";

export const cronRoutes = new Hono();

/** Simple CRON_SECRET guard for background jobs scheduled externally. */
cronRoutes.use("*", async (c, next) => {
  const expected = process.env.CRON_SECRET;
  const auth = c.req.header("authorization") ?? "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : c.req.query("cron") ?? "";
  if (!expected || supplied !== expected) {
    return c.json({ error: { code: "FORBIDDEN", message: "Invalid cron token." } }, 403);
  }
  await next();
});

cronRoutes.post("/expiry", async (c) => {
  const summary = await runExpiryJob();
  return c.json({ ok: true, summary });
});