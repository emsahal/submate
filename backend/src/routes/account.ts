import { Hono } from "hono";
import { z } from "zod";
import { count, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, subscriptions as subs } from "../db/schema.js";
import { orders as ordersTable } from "../db/schema.js";
import { requireUser } from "../middleware/auth.js";
import { rateLimit } from "../rate-limit/index.js";
import { createOrder, cancelOrder, listUserOrders, getOrderDetailForUser } from "../services/orders.js";
import { createPaymentAttempt, allowedImageMimeTypes } from "../services/payments.js";
import { listSubscriptionsForUser, getSubscriptionForUser, remainingDays, confirmSubscriptionReceived } from "../services/subscriptions.js";
import { requestOtpForSubscription } from "../services/otp.js";
import { listForUser, markRead, markAllRead, unreadCount } from "../services/notifications.js";
import { getSettings } from "../lib/settings.js";
import { ApiError } from "../lib/errors.js";
import type { AppVariables } from "../middleware/auth.js";

export const accountRoutes = new Hono<{ Variables: AppVariables }>();

accountRoutes.use("*", requireUser);

/* --------------------------------- Profile --------------------------------- */

accountRoutes.get("/me", async (c) => {
  const user = c.get("user");
  const [profile, unread] = await Promise.all([
    db.query.users.findFirst({ where: (t, { eq }) => eq(t.id, user.id) }),
    unreadCount(user.id),
  ]);
  if (!profile) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  return c.json({
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      image: profile.image,
      role: profile.role,
      phone: profile.phone,
      createdAt: profile.createdAt.toISOString(),
    },
    unreadNotifications: unread,
  });
});

const profilePatch = z.object({
  phone: z.string().trim().max(30).optional(),
  name: z.string().trim().min(2).max(100).optional(),
});

accountRoutes.patch("/me/profile", async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = profilePatch.safeParse(body);
  if (!parsed.success) return c.json({ error: { code: "VALIDATION", message: "Invalid profile data." } }, 422);
  const updates: Partial<typeof users.$inferSelect> = {};
  if (parsed.data.name !== undefined) updates.name = parsed.data.name;
  if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
  if (Object.keys(updates).length) {
    await db.update(users).set(updates).where(eq(users.id, user.id));
  }
  return c.json({ ok: true });
});

accountRoutes.get("/me/overview", async (c) => {
  const user = c.get("user");
  const today = new Date().toISOString().slice(0, 10);
  const in7Days = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

  const [activeSubscriptions, pendingOrders, expiringSoon, completedOrders, unread] = await Promise.all([
    db
      .select({ value: count() })
      .from(subs)
      .where(sql`${subs.userId} = ${user.id} AND ${subs.status} IN ('ACTIVE','EXPIRING_SOON')`),
    db
      .select({ value: count() })
      .from(ordersTable)
      .where(
        sql`${ordersTable.userId} = ${user.id} AND ${ordersTable.status} IN ('PENDING_PAYMENT','PAYMENT_SUBMITTED','AI_REVIEWED','UNDER_ADMIN_REVIEW')`,
      ),
    db
      .select({ value: count() })
      .from(subs)
      .where(sql`${subs.userId} = ${user.id} AND ${subs.expiryDate} BETWEEN ${today} AND ${in7Days} AND ${subs.status} IN ('ACTIVE','EXPIRING_SOON')`),
    db.select({ value: count() }).from(ordersTable).where(sql`${ordersTable.userId} = ${user.id} AND ${ordersTable.status} = 'FULFILLED'`),
    unreadCount(user.id),
  ]);

  return c.json({
    activeSubscriptions: activeSubscriptions[0]?.value ?? 0,
    pendingOrders: pendingOrders[0]?.value ?? 0,
    expiringSoon: expiringSoon[0]?.value ?? 0,
    completedOrders: completedOrders[0]?.value ?? 0,
    unreadNotifications: unread,
  });
});

/* ---------------------------------- Orders --------------------------------- */

const createOrderBody = z.object({
  productId: z.number().int().positive(),
  planId: z.number().int().positive(),
  screens: z.number().int().min(1).max(5).default(1),
  paymentMethodId: z.number().int().positive().optional(),
});

accountRoutes.post("/me/orders", rateLimit("order-create", 5, 60_000), async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = createOrderBody.safeParse(body);
  if (!parsed.success) return c.json({ error: { code: "VALIDATION", message: "Invalid order payload.", details: parsed.error.flatten() } }, 422);
  const order = await createOrder({
    userId: user.id,
    productId: parsed.data.productId,
    planId: parsed.data.planId,
    screens: parsed.data.screens,
    paymentMethodId: parsed.data.paymentMethodId,
    ip: c.req.header("x-forwarded-for") ?? undefined,
  });
  return c.json({ order }, 201);
});

accountRoutes.get("/me/orders", async (c) => {
  const user = c.get("user");
  const q = c.req.query();
  return c.json({ items: await listUserOrders(user.id, Math.min(Number(q.limit ?? 20), 50)) });
});

accountRoutes.get("/me/orders/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "BAD_ID", "Invalid order id.");
  return c.json({ order: await getOrderDetailForUser(user.id, id) });
});

accountRoutes.post("/me/orders/:id/cancel", rateLimit("order-cancel", 5, 60_000), async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "BAD_ID", "Invalid order id.");
  const order = await cancelOrder({ userId: user.id, orderId: id, ip: c.req.header("x-forwarded-for") });
  return c.json({ order });
});

/* ------------------------------ Payment upload ----------------------------- */

accountRoutes.post("/me/orders/:id/payment", rateLimit("payment-upload", 4, 600_000), async (c) => {
  const user = c.get("user");
  const orderId = Number(c.req.param("id"));
  if (!Number.isInteger(orderId) || orderId <= 0) throw new ApiError(400, "BAD_ID", "Invalid order id.");

  const form = await c.req.parseBody();
  const methodId = Number(form.paymentMethodId ?? 0);
  const file = form.screenshot;

  if (!Number.isInteger(methodId) || methodId <= 0) {
    return c.json({ error: { code: "VALIDATION", message: "Select a payment method." } }, 422);
  }

  if (!(file instanceof File) || !file.size) {
    return c.json({ error: { code: "VALIDATION", message: "Upload a payment screenshot." } }, 422);
  }

  const allowed = [...allowedImageMimeTypes()];
  if (!allowed.includes(file.type)) {
    return c.json({ error: { code: "BAD_FILE_TYPE", message: `Unsupported file type "${file.type}". Upload PNG, JPG or WEBP.` } }, 415);
  }

  const settings = await getSettings();
  if (file.size > settings.order.screenshotMaxBytes) {
    return c.json({
      error: {
        code: "FILE_TOO_LARGE",
        message: `Screenshot exceeds the ${Math.round(settings.order.screenshotMaxBytes / 1048576)}MB limit.`,
      },
    }, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await createPaymentAttempt({
    userId: user.id,
    orderId,
    methodId,
    ip: c.req.header("x-forwarded-for"),
    screenshot: {
      fileName: file.name || "screenshot.png",
      mimeType: file.type,
      sizeBytes: file.size,
      base64: buffer.toString("base64"),
    },
  });

  return c.json({ ok: true, paymentId: result.paymentId, orderId: result.orderId, screenshotId: result.screenshotId }, 201);
});

/* ------------------------------ Subscriptions ----------------------------- */

accountRoutes.get("/me/subscriptions", async (c) => {
  const user = c.get("user");
  const q = c.req.query();
  return c.json({ items: await listSubscriptionsForUser(user.id, Math.min(Number(q.limit ?? 50), 100)) });
});

accountRoutes.get("/me/subscriptions/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "BAD_ID", "Invalid subscription id.");
  const sub = await getSubscriptionForUser(user.id, id);
  return c.json({ subscription: sub, remainingDays: remainingDays(sub.expiryDate) });
});

accountRoutes.post("/me/subscriptions/:id/request-otp", rateLimit("otp-request", 5, 60_000), async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "BAD_ID", "Invalid subscription id.");
  const result = await requestOtpForSubscription({ userId: user.id, subscriptionId: id });
  return c.json(result);
});

accountRoutes.post("/me/subscriptions/:id/confirm", rateLimit("sub-confirm", 5, 60_000), async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "BAD_ID", "Invalid subscription id.");
  const sub = await confirmSubscriptionReceived({ userId: user.id, subscriptionId: id, ip: c.req.header("x-forwarded-for") });
  return c.json({ ok: true, subscription: { ...sub, userConfirmedAt: sub.userConfirmedAt ? new Date(sub.userConfirmedAt).toISOString() : null } });
});

/* ------------------------------ Notifications ------------------------------ */

accountRoutes.get("/me/notifications", async (c) => {
  const user = c.get("user");
  const q = c.req.query();
  const [items, unread] = await Promise.all([listForUser(user.id, Math.min(Number(q.limit ?? 30), 100)), unreadCount(user.id)]);
  return c.json({ items, unread });
});

accountRoutes.post("/me/notifications/read-all", async (c) => {
  const user = c.get("user");
  await markAllRead(user.id);
  return c.json({ ok: true });
});

accountRoutes.post("/me/notifications/:id/read", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "BAD_ID", "Invalid notification id.");
  await markRead(user.id, id);
  return c.json({ ok: true });
});