import { Hono } from "hono";
import { z } from "zod";
import {
  listCategories,
  listProducts,
  getProductBySlug,
  listPublishedBlog,
  getPublishedBlogBySlug,
  listPublishedFaqs,
  listPublishedReviews,
  getReviewSummary,
  canReview,
  getCategoryBySlug,
} from "../services/catalog.js";
import { createReview } from "../services/reviews.js";
import { db } from "../db/index.js";
import { paymentMethods } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import { requireUser } from "../middleware/auth.js";
import { rateLimit } from "../rate-limit/index.js";
import { getChatReply } from "../ai/chat.js";
import { config } from "../config.js";
import { ApiError } from "../lib/errors.js";
import type { AppVariables } from "../middleware/auth.js";

export const publicRoutes = new Hono<{ Variables: AppVariables }>();

publicRoutes.get("/health", (c) => c.json({ ok: true, service: "subly-backend", time: new Date().toISOString() }));

publicRoutes.get("/products", async (c) => {
  const q = c.req.query();
  const input = {
    search: q.search?.trim(),
    category: q.category,
    sort: (q.sort as never) || undefined,
    minPrice: q.minPrice ? Number(q.minPrice) : undefined,
    maxPrice: q.maxPrice ? Number(q.maxPrice) : undefined,
    durationDays: q.duration ? Number(q.duration) : undefined,
    limit: Math.min(Number(q.limit ?? 12), 48),
    offset: Math.max(Number(q.offset ?? 0), 0),
  };
  const result = await listProducts(input);
  return c.json(result);
});

publicRoutes.get("/products/:slug", async (c) => {
  const product = await getProductBySlug(c.req.param("slug"));
  const reviews = await listPublishedReviews(product.id, 6);
  const { average, count } = await getReviewSummary(product.id);
  return c.json({ product, reviews, reviewSummary: { average, count } });
});

publicRoutes.get("/categories", async (c) => c.json(await listCategories()));

publicRoutes.get("/categories/:slug", async (c) => {
  const category = await getCategoryBySlug(c.req.param("slug"));
  const products = await listProducts({ category: category.slug, limit: 48 });
  return c.json({ category, products });
});

publicRoutes.get("/blog", async (c) => {
  const q = c.req.query();
  return c.json(await listPublishedBlog({ limit: Number(q.limit ?? 12), offset: Number(q.offset ?? 0) }));
});

publicRoutes.get("/blog/:slug", async (c) => c.json(await getPublishedBlogBySlug(c.req.param("slug"))));

publicRoutes.get("/faqs", async (c) => c.json(await listPublishedFaqs()));

publicRoutes.get("/payment-methods", async (c) => {
  const rows = await db
    .select({ id: paymentMethods.id, name: paymentMethods.name, type: paymentMethods.type })
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))
    .orderBy(desc(paymentMethods.sortOrder));
  return c.json(rows);
});

/* ----------------------- Authenticated: submit review ----------------------- */

const reviewBody = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional(),
});

publicRoutes.post("/reviews", requireUser, async (c) => {
  const user = c.get("user");
  const body = await c.req.json().catch(() => null);
  const parsed = reviewBody.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: { code: "VALIDATION", message: "Invalid review payload.", details: parsed.error.flatten() } }, 422);
  }
  const { productId, rating, comment } = parsed.data;
  const allowed = await canReview(user.id, productId);
  if (!allowed) throw new ApiError(403, "REVIEW_NOT_ALLOWED", "You can only review products you have purchased.");
  const review = await createReview({ userId: user.id, productId, rating, comment });
  return c.json({ review }, 201);
});

/* ----------------------- Public AI support chat ----------------------- */

const chatBody = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(40),
});

publicRoutes.post("/chat", rateLimit("chat", 20, 60_000), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = chatBody.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: "VALIDATION", message: "Invalid chat payload.", details: parsed.error.flatten() } },
      422,
    );
  }
  const history = parsed.data.messages;
  if (history[history.length - 1]!.role !== "user") {
    return c.json({ error: { code: "VALIDATION", message: "The last message must be from the user." } }, 422);
  }
  try {
    const reply = await getChatReply(history);
    return c.json({ reply });
  } catch (err) {
    console.error("[api] chat error", err);
    if (!config.nvidiaApiKey) {
      return c.json({ error: { code: "AI_UNAVAILABLE", message: "AI chat is not configured yet." } }, 503);
    }
    return c.json({ error: { code: "AI_ERROR", message: "The assistant is busy right now. Try again shortly or reach us on WhatsApp." } }, 502);
  }
});