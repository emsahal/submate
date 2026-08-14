import { Hono } from "hono";
import { z } from "zod";
import { asc, count, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  products,
  plans,
  categories,
  paymentMethods,
  blogPosts,
  faqItems,
  adminActions,
  auditLogs,
  users,
  accountInventory,
} from "../db/schema.js";
import { encryptPayload, decryptPayload } from "../lib/crypto.js";
import { requireAdmin } from "../middleware/auth.js";
import { rateLimit } from "../rate-limit/index.js";
import { adminDashboardStats, listAdminUsers, updateUserStatus, moderateReview, listReviewsAdmin } from "../services/admin.js";
import { listOrdersForAdmin, getOrderForAdmin } from "../services/orders.js";
import { listPaymentsForReview, paymentForAdmin, decidePayment } from "../services/payments.js";
import {
  listSubscriptionsForAdmin,
  getSubscriptionForUser,
  fulfillOrder,
  setAccessCredential,
  renewSubscription,
  changeSubscriptionStatus,
} from "../services/subscriptions.js";
import { allSettings, setSetting } from "../lib/settings.js";
import { logAudit } from "../lib/audit.js";
import { ApiError } from "../lib/errors.js";
import { buildGmailAuthorizeUrl, disconnectGmail, getGmailConnection } from "../services/gmail.js";
import type { AppVariables } from "../middleware/auth.js";

export const adminRoutes = new Hono<{ Variables: AppVariables }>();

adminRoutes.use("*", requireAdmin);

function parseBody<T>(body: unknown, schema: z.ZodType<T>): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, "VALIDATION", "Invalid payload.", parsed.error.flatten() as never);
  }
  return parsed.data;
}

/* --------------------------------- Dashboard -------------------------------- */

adminRoutes.get("/stats", async (c) => c.json(await adminDashboardStats()));

/* ---------------------------------- Orders ---------------------------------- */

adminRoutes.get("/orders", async (c) => {
  const q = c.req.query();
  return c.json(
    await listOrdersForAdmin({
      status: q.status || undefined,
      userId: q.userId || undefined,
      limit: Math.min(Number(q.limit ?? 30), 100),
      offset: Math.max(Number(q.offset ?? 0), 0),
    }),
  );
});

adminRoutes.get("/orders/:id", async (c) => c.json(await getOrderForAdmin(Number(c.req.param("id")))));

const fulfillBody = z.object({ notes: z.string().max(1000).optional() });
adminRoutes.post("/orders/:id/fulfill", rateLimit("admin-write", 10, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), fulfillBody);
  const sub = await fulfillOrder({ adminId: admin.id, orderId: Number(c.req.param("id")), notes: body.notes, ip: c.req.header("x-forwarded-for") });
  return c.json({ subscription: sub });
});

/* --------------------------------- Payments -------------------------------- */

adminRoutes.get("/payments", async (c) => {
  const q = c.req.query();
  return c.json(
    await listPaymentsForReview({
      status: q.status || undefined,
      limit: Math.min(Number(q.limit ?? 30), 100),
      offset: Math.max(Number(q.offset ?? 0), 0),
    }),
  );
});

adminRoutes.get("/payments/:id/review", async (c) => c.json(await paymentForAdmin(Number(c.req.param("id")))));

const decisionBody = z.object({
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_REUPLOAD"]),
  note: z.string().max(2000).optional(),
});
adminRoutes.post("/payments/:id/decision", rateLimit("admin-write", 15, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), decisionBody);
  const result = await decidePayment({
    adminId: admin.id,
    paymentId: Number(c.req.param("id")),
    decision: body.decision,
    note: body.note,
    ip: c.req.header("x-forwarded-for"),
  });
  return c.json(result);
});

/* ------------------------------- Subscriptions ------------------------------ */

adminRoutes.get("/subscriptions", async (c) => {
  const q = c.req.query();
  return c.json(
    await listSubscriptionsForAdmin({
      status: q.status || undefined,
      userId: q.userId || undefined,
      limit: Math.min(Number(q.limit ?? 30), 100),
      offset: Math.max(Number(q.offset ?? 0), 0),
    }),
  );
});

adminRoutes.get("/subscriptions/:id", async (c) => {
  const sub = await db.query.subscriptions.findFirst({ where: (t, { eq: e }) => e(t.id, Number(c.req.param("id"))) });
  if (!sub) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.");
  const detail = await getSubscriptionForUser(sub.userId, sub.id);
  return c.json({ subscription: detail, userId: sub.userId });
});

const subActionBody = z.object({ action: z.enum(["RENEW", "SUSPEND", "ACTIVATE", "CANCEL"]), note: z.string().max(1000).optional() });
adminRoutes.post("/subscriptions/:id/action", rateLimit("admin-write", 10, 60_000), async (c) => {
  const admin = c.get("user");
  const id = Number(c.req.param("id"));
  const body = parseBody(await c.req.json().catch(() => null), subActionBody);
  if (body.action === "RENEW") return c.json({ subscription: await renewSubscription({ adminId: admin.id, subscriptionId: id, action: "RENEW", note: body.note }) });
  return c.json({ subscription: await changeSubscriptionStatus({ adminId: admin.id, subscriptionId: id, action: body.action, note: body.note }) });
});

const credentialBody = z.object({
  type: z.enum(["PROVIDER_LINK", "LICENSE_KEY", "REDEEM_CODE", "ACCESS_URL", "BULK_ACCESS", "GENERIC"]),
  payload: z.string().min(1).max(4000),
  publicMeta: z.record(z.string(), z.string()).optional(),
  notes: z.string().max(1000).optional(),
});
adminRoutes.post("/subscriptions/:id/credential", rateLimit("admin-write", 10, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), credentialBody);
  await setAccessCredential({
    adminId: admin.id,
    subscriptionId: Number(c.req.param("id")),
    type: body.type,
    sensitivePayload: body.payload,
    publicMeta: body.publicMeta,
    notes: body.notes,
  });
  return c.json({ ok: true });
});

const inventoryAddBody = z.object({
  productId: z.number().int().positive(),
  email: z.string().trim().email(),
  password: z.string().trim().min(1).max(200),
  maxSlots: z.number().int().positive().default(5),
  notes: z.string().max(1000).optional(),
});

adminRoutes.get("/inventory", async (c) => {
  const items = await db.select().from(accountInventory).orderBy(desc(accountInventory.createdAt));
  const decryptedItems = items.map((item) => {
    let password = "";
    try {
      password = decryptPayload(item.encryptedPassword, item.encryptionIv, item.keyVersion);
    } catch {
      password = "Decryption Failed";
    }
    return {
      ...item,
      password,
    };
  });
  return c.json({ items: decryptedItems });
});

adminRoutes.post("/inventory", rateLimit("admin-write", 10, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), inventoryAddBody);
  const { ciphertext, iv, keyVersion } = encryptPayload(body.password);

  const inserted = await db
    .insert(accountInventory)
    .values({
      productId: body.productId,
      email: body.email,
      encryptedPassword: ciphertext,
      encryptionIv: iv,
      keyVersion,
      maxSlots: body.maxSlots,
      usedSlots: 0,
      notes: body.notes,
    })
    .returning();

  void logAudit({
    actorId: admin.id,
    actorRole: "ADMIN",
    action: "inventory.account.added",
    targetType: "inventory",
    targetId: String(inserted[0]?.id),
    meta: { email: body.email },
  });

  return c.json({ ok: true, item: inserted[0] });
});

adminRoutes.delete("/inventory/:id", rateLimit("admin-write", 10, 60_000), async (c) => {
  const admin = c.get("user");
  const id = Number(c.req.param("id"));

  const deleted = await db
    .delete(accountInventory)
    .where(eq(accountInventory.id, id))
    .returning();

  if (deleted[0]) {
    void logAudit({
      actorId: admin.id,
      actorRole: "ADMIN",
      action: "inventory.account.deleted",
      targetType: "inventory",
      targetId: String(id),
      meta: { email: deleted[0].email },
    });
  }

  return c.json({ ok: true });
});

/* --------------------------------- Products -------------------------------- */

const productPayload = {
  name: z.string().trim().min(2).max(200),
  categoryId: z.number().int().positive(),
  shortDescription: z.string().trim().max(500).optional(),
  description: z.string().trim().max(20_000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
  logoUrlDark: z.string().url().optional().or(z.literal("")),
  features: z.array(z.string().max(200)).max(30).optional(),
  providerName: z.string().trim().max(120).optional(),
  isVerified: z.boolean().optional(),
  eligibilityNote: z.string().trim().max(2000).optional(),
  seoTitle: z.string().trim().max(120).optional(),
  seoDescription: z.string().trim().max(300).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
};
const productBody = z.object(productPayload);
const productCreateBody = productBody.and(
  z.object({ slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9-]+$/) }),
);

adminRoutes.get("/products", async (c) => {
  const q = c.req.query();
  const items = await db
    .select()
    .from(products)
    .where(q.status ? eq(products.status, q.status as never) : undefined)
    .orderBy(desc(products.id))
    .limit(Math.min(Number(q.limit ?? 50), 200))
    .offset(Math.max(Number(q.offset ?? 0), 0));
  return c.json({ items });
});

adminRoutes.get("/products/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const product = await db.query.products.findFirst({ where: (t, { eq: e }) => e(t.id, id) });
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  const plansForProduct = await db.select().from(plans).where(eq(plans.productId, id)).orderBy(asc(plans.sortOrder));
  return c.json({ product, plans: plansForProduct });
});

adminRoutes.post("/products", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), productCreateBody);
  const cat = await db.query.categories.findFirst({ where: (t, { eq: e }) => e(t.id, body.categoryId) });
  if (!cat) throw new ApiError(400, "CATEGORY_NOT_FOUND", "Category not found.");
  const inserted = await db
    .insert(products)
    .values({
      slug: body.slug,
      name: body.name,
      categoryId: body.categoryId,
      shortDescription: body.shortDescription ?? "",
      description: body.description ?? "",
      imageUrl: body.imageUrl || null,
      logoUrl: body.logoUrl || null,
      logoUrlDark: body.logoUrlDark || null,
      features: body.features ?? [],
      providerName: body.providerName ?? null,
      isVerified: body.isVerified ?? false,
      eligibilityNote: body.eligibilityNote ?? null,
      seoTitle: body.seoTitle ?? null,
      seoDescription: body.seoDescription ?? null,
      status: body.status ?? "DRAFT",
      isFeatured: body.isFeatured ?? false,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();
  const product = inserted[0];
  if (!product) throw new ApiError(500, "PRODUCT_CREATE_FAILED", "Could not create product.");
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "product.created", targetType: "product", targetId: String(product.id), meta: { name: product.name, slug: product.slug } });
  return c.json({ product }, 201);
});

adminRoutes.patch("/products/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const id = Number(c.req.param("id"));
  const body = parseBody(await c.req.json().catch(() => null), productBody.partial());
  const existing = await db.query.products.findFirst({ where: (t, { eq: e }) => e(t.id, id) });
  if (!existing) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === "imageUrl" || k === "logoUrl" || k === "logoUrlDark") updates[k] = (v as string) || null;
    else updates[k] = v;
  }
  if (updates.shortDescription === "") updates.shortDescription = existing.shortDescription;
  if (updates.description === "") updates.description = existing.description;
  if (updates.categoryId === undefined) updates.categoryId = existing.categoryId;
  await db.update(products).set({ ...updates, updatedAt: new Date() }).where(eq(products.id, id));
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "product.updated", targetType: "product", targetId: String(id), meta: { name: existing.name } });
  return c.json({ ok: true });
});

adminRoutes.delete("/products/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const id = Number(c.req.param("id"));
  await db.delete(products).where(eq(products.id, id));
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "product.deleted", targetType: "product", targetId: String(id) });
  return c.json({ ok: true });
});

const planBody = z.object({
  name: z.string().trim().min(1).max(120),
  durationDays: z.number().int().min(1).max(3650),
  priceLocal: z.number().positive(),
  priceUsd: z.number().nonnegative().optional(),
  description: z.string().max(400).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});
adminRoutes.post("/products/:id/plans", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const productId = Number(c.req.param("id"));
  const body = parseBody(await c.req.json().catch(() => null), planBody);
  const inserted = await db
    .insert(plans)
    .values({
      productId,
      name: body.name,
      durationDays: body.durationDays,
      priceLocal: body.priceLocal,
      priceUsd: body.priceUsd ?? 0,
      description: body.description ?? null,
      currency: "PKR",
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "plan.created", targetType: "plan", targetId: String(inserted[0]?.id ?? "") });
  return c.json({ plan: inserted[0] }, 201);
});

adminRoutes.patch("/plans/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), planBody.partial());
  if (body.priceUsd === undefined) delete body.priceUsd;
  await db.update(plans).set({ ...body, updatedAt: new Date() }).where(eq(plans.id, Number(c.req.param("id"))));
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "plan.updated", targetType: "plan", targetId: String(c.req.param("id")) });
  return c.json({ ok: true });
});

/* -------------------------------- Categories -------------------------------- */

const categoryBody = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(160).regex(/^[a-z0-9-]+$/),
  sortOrder: z.number().int().optional(),
});

adminRoutes.get("/categories", async (c) => {
  const items = await db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id));
  return c.json({ items });
});

adminRoutes.post("/categories", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), categoryBody);
  const inserted = await db.insert(categories).values({ name: body.name, slug: body.slug, sortOrder: body.sortOrder ?? 0 }).returning();
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "category.created", targetType: "category", targetId: String(inserted[0]?.id ?? "") });
  return c.json({ category: inserted[0] }, 201);
});

adminRoutes.patch("/categories/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  await db.update(categories).set({ ...parseBody(await c.req.json().catch(() => null), categoryBody.partial()), updatedAt: new Date() }).where(eq(categories.id, Number(c.req.param("id"))));
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "category.updated", targetType: "category", targetId: c.req.param("id") });
  return c.json({ ok: true });
});

adminRoutes.delete("/categories/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  await db.delete(categories).where(eq(categories.id, Number(c.req.param("id"))));
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "category.deleted", targetType: "category", targetId: c.req.param("id") });
  return c.json({ ok: true });
});

/* ------------------------------ Payment methods ----------------------------- */

const methodBody = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(["EASYPAISA", "JAZZCASH", "BANK_TRANSFER", "NAYAPAY", "OTHER"]),
  accountDetails: z.record(z.string(), z.string()).optional(),
  instructions: z.string().trim().max(2000).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

adminRoutes.get("/payment-methods", async (c) => {
  const items = await db.select().from(paymentMethods).orderBy(asc(paymentMethods.sortOrder));
  return c.json({ items });
});

adminRoutes.post("/payment-methods", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), methodBody);
  const inserted = await db
    .insert(paymentMethods)
    .values({
      name: body.name,
      type: body.type,
      accountDetails: body.accountDetails ?? {},
      instructions: body.instructions ?? null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder ?? 0,
    })
    .returning();
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "payment-method.created", targetType: "paymentMethod", targetId: String(inserted[0]?.id ?? "") });
  return c.json({ method: inserted[0] }, 201);
});

adminRoutes.patch("/payment-methods/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  await db.update(paymentMethods).set({ ...parseBody(await c.req.json().catch(() => null), methodBody.partial()), updatedAt: new Date() }).where(eq(paymentMethods.id, Number(c.req.param("id"))));
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "payment-method.updated", targetType: "paymentMethod", targetId: c.req.param("id") });
  return c.json({ ok: true });
});

/* ----------------------------------- Users ---------------------------------- */

adminRoutes.get("/users", async (c) => {
  const q = c.req.query();
  return c.json(await listAdminUsers({ search: q.search, limit: Math.min(Number(q.limit ?? 30), 100), offset: Math.max(Number(q.offset ?? 0), 0) }));
});

const userPatch = z.object({ role: z.enum(["USER", "ADMIN"]).optional(), isSuspended: z.boolean().optional() });
adminRoutes.patch("/users/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), userPatch);
  return c.json(await updateUserStatus({ adminId: admin.id, userId: c.req.param("id")!, role: body.role, isSuspended: body.isSuspended }));
});

/* ---------------------------------- Reviews --------------------------------- */

adminRoutes.get("/reviews", async (c) => {
  const q = c.req.query();
  return c.json(await listReviewsAdmin({ status: q.status, page: Number(q.page ?? 1), pageSize: Math.min(Number(q.pageSize ?? 20), 100) }));
});

const moderateBody = z.object({ status: z.enum(["PUBLISHED", "HIDDEN"]) });
adminRoutes.post("/reviews/:id/moderate", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), moderateBody);
  return c.json(await moderateReview({ adminId: admin.id, reviewId: Number(c.req.param("id")), status: body.status }));
});

/* ----------------------------------- Blog ----------------------------------- */

const blogBody = z.object({
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(10),
  coverImage: z.string().url().optional().or(z.literal("")),
  tags: z.array(z.string().max(60)).max(10).optional(),
  isPublished: z.boolean().optional(),
});

adminRoutes.get("/blog", async (c) => {
  const q = c.req.query();
  const items = await db
    .select()
    .from(blogPosts)
    .where(q.status ? eq(blogPosts.status, q.status as never) : undefined)
    .orderBy(desc(blogPosts.createdAt))
    .limit(Math.min(Number(q.limit ?? 50), 200));
  return c.json({ items });
});

adminRoutes.get("/blog/:id", async (c) => {
  const post = await db.query.blogPosts.findFirst({ where: (t, { eq: e }) => e(t.id, Number(c.req.param("id"))) });
  if (!post) throw new ApiError(404, "BLOG_NOT_FOUND", "Blog post not found.");
  return c.json({ post });
});

adminRoutes.post("/blog", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), blogBody);
  const published = body.isPublished === true;
  const inserted = await db
    .insert(blogPosts)
    .values({
      title: body.title,
      slug: body.slug,
      excerpt: body.excerpt ?? "",
      content: body.content,
      coverImage: body.coverImage || null,
      tags: body.tags ?? [],
      status: published ? "PUBLISHED" : "DRAFT",
      publishedAt: published ? new Date() : null,
      authorId: admin.id,
    })
    .returning();
  return c.json({ post: inserted[0] }, 201);
});

adminRoutes.patch("/blog/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), blogBody.partial());
  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (k === "isPublished") {
      updates.status = v ? "PUBLISHED" : "DRAFT";
      updates.publishedAt = v ? new Date() : null;
    } else if (k === "coverImage") updates[k] = (v as string) || null;
    else updates[k] = v;
  }
  await db.update(blogPosts).set({ ...updates, updatedAt: new Date() }).where(eq(blogPosts.id, Number(c.req.param("id"))));
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "blog.updated", targetType: "blog", targetId: c.req.param("id") });
  return c.json({ ok: true });
});

adminRoutes.delete("/blog/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  const admin = c.get("user");
  await db.delete(blogPosts).where(eq(blogPosts.id, Number(c.req.param("id"))));
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "blog.deleted", targetType: "blog", targetId: c.req.param("id") });
  return c.json({ ok: true });
});

/* ----------------------------------- FAQs ----------------------------------- */

const faqBody = z.object({
  question: z.string().trim().min(3).max(500),
  answer: z.string().trim().min(3).max(4000),
  category: z.string().trim().max(60).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

adminRoutes.get("/faqs", async (c) => {
  const items = await db.select().from(faqItems).orderBy(asc(faqItems.sortOrder));
  return c.json({ items });
});

adminRoutes.post("/faqs", rateLimit("admin-write", 20, 60_000), async (c) => {
  const body = parseBody(await c.req.json().catch(() => null), faqBody);
  const inserted = await db
    .insert(faqItems)
    .values({ question: body.question, answer: body.answer, category: body.category ?? null, sortOrder: body.sortOrder ?? 0, isActive: body.isActive ?? true })
    .returning();
  return c.json({ item: inserted[0] }, 201);
});

adminRoutes.patch("/faqs/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  await db.update(faqItems).set({ ...parseBody(await c.req.json().catch(() => null), faqBody.partial()), updatedAt: new Date() }).where(eq(faqItems.id, Number(c.req.param("id"))));
  return c.json({ ok: true });
});

adminRoutes.delete("/faqs/:id", rateLimit("admin-write", 20, 60_000), async (c) => {
  await db.delete(faqItems).where(eq(faqItems.id, Number(c.req.param("id"))));
  return c.json({ ok: true });
});

/* --------------------------------- Settings --------------------------------- */

adminRoutes.get("/gmail/status", async (c) => {
  const conn = await getGmailConnection();
  return c.json({
    connected: Boolean(conn),
    email: conn?.email ?? null,
    connectedAt: conn?.connectedAt ?? null,
  });
});

adminRoutes.get("/gmail/authorize", async (c) => {
  try {
    return c.json({ url: buildGmailAuthorizeUrl() });
  } catch (err) {
    throw new ApiError(503, "GMAIL_NOT_CONFIGURED", err instanceof Error ? err.message : "Google OAuth credentials are not configured.");
  }
});

adminRoutes.post("/gmail/disconnect", rateLimit("admin-write", 10, 60_000), async (c) => {
  const admin = c.get("user");
  await disconnectGmail();
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "gmail.disconnected", targetType: "settings", targetId: "gmailOtp" });
  return c.json({ ok: true });
});

adminRoutes.get("/settings", async (c) => c.json({ settings: await allSettings() }));

const settingsPatch = z.object({
  storeName: z.string().max(100).optional(),
  supportEmail: z.string().email().optional(),
  currency: z.string().length(3).optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().max(500).optional(),
  seo: z.object({ defaultTitle: z.string().max(120).optional(), defaultDescription: z.string().max(300).optional() }).optional(),
  order: z.object({ pendingExpiryHours: z.number().max(168).optional(), screenshotMaxBytes: z.number().max(20 * 1024 * 1024).optional(), allowedMimeTypes: z.array(z.string()).optional() }).optional(),
  notifications: z.object({ expiry7d: z.boolean().optional(), expiry3d: z.boolean().optional(), expiry1d: z.boolean().optional(), expired: z.boolean().optional() }).optional(),
});
adminRoutes.patch("/settings", rateLimit("admin-write", 30, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), settingsPatch.partial());
  for (const [k, v] of Object.entries(body)) {
    await setSetting(k, v, admin.id);
  }
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "settings.updated", targetType: "settings", targetId: "store", meta: { keys: Object.keys(body) } });
  return c.json({ ok: true });
});

const broadcastBody = z.object({ title: z.string().trim().min(2).max(160), body: z.string().trim().min(2).max(1000), link: z.string().max(500).optional() });
adminRoutes.post("/notifications/broadcast", rateLimit("admin-write", 10, 60_000), async (c) => {
  const admin = c.get("user");
  const body = parseBody(await c.req.json().catch(() => null), broadcastBody);
  const all = await db.select().from(users);
  await Promise.all(
    all.map((u) =>
      notifyAdminsForUser(u.id, {
        kind: "ADMIN",
        title: body.title,
        body: body.body,
        link: body.link,
        dedupKey: `broadcast-${body.title.slice(0, 40)}`,
      }),
    ),
  );
  void logAudit({ actorId: admin.id, actorRole: "ADMIN", action: "notification.broadcast", targetType: "users", targetId: String(all.length) });
  return c.json({ ok: true, recipients: all.length });
});

/* -------------------------------- Audit trail ------------------------------- */

adminRoutes.get("/audit-logs", async (c) => {
  const q = c.req.query();
  const items = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(Math.min(Number(q.limit ?? 50), 200))
    .offset(Math.max(Number(q.offset ?? 0), 0));
  const totalRow = await db.select({ value: count() }).from(auditLogs);
  return c.json({ items, total: totalRow[0]?.value ?? 0 });
});

adminRoutes.get("/admin-actions", async (c) => {
  const q = c.req.query();
  const items = await db
    .select()
    .from(adminActions)
    .orderBy(desc(adminActions.createdAt))
    .limit(Math.min(Number(q.limit ?? 50), 200))
    .offset(Math.max(Number(q.offset ?? 0), 0));
  return c.json({ items });
});

async function notifyAdminsForUser(userId: string, input: { kind: "ADMIN"; title: string; body: string; link?: string; dedupKey?: string }) {
  const { notify } = await import("../services/notifications.js");
  await notify({ userId, kind: input.kind, title: input.title, body: input.body, link: input.link, dedupKey: input.dedupKey });
}