import { and, asc, count, desc, eq, gte, ilike, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { products, plans, categories, reviews, users, blogPosts, faqItems } from "../db/schema.js";
import { ApiError } from "../lib/errors.js";
import type {
  PublicCategory,
  PublicPlan,
  PublicProduct,
  PublicBlogPost,
  PublicBlogPostDetail,
  PublicFaq,
  PublicReview,
  Paginated,
} from "@shared/types.js";

/* ------------------------------- Categories ------------------------------- */

export async function listCategories(): Promise<PublicCategory[]> {
  const rows = await db
    .select({ category: categories, productCount: count(products.id) })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.status, "ACTIVE")))
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));

  return rows.map((r) => ({
    id: r.category.id,
    name: r.category.name,
    slug: r.category.slug,
    description: r.category.description,
    image: r.category.image,
    icon: r.category.icon,
    productCount: Number(r.productCount),
  }));
}

export async function getCategoryBySlug(slug: string) {
  const row = await db.query.categories.findFirst({
    where: (t, { eq: e }) => e(t.slug, slug),
  });
  if (!row || !row.isActive) throw new ApiError(404, "CATEGORY_NOT_FOUND", "Category not found.");
  return row as typeof row & { products: PublicProduct[] };
}

/* -------------------------------- Products -------------------------------- */

const ACTIVE = "ACTIVE";

export async function listProducts(input: {
  search?: string;
  category?: string;
  sort?: "popular" | "price_asc" | "price_desc" | "newest";
  minPrice?: number;
  maxPrice?: number;
  durationDays?: number;
  limit?: number;
  offset?: number;
}): Promise<Paginated<PublicProduct>> {
  const base = db.select({ product: products, plan: plans }).from(products)
    .leftJoin(plans, eq(plans.productId, products.id));

  const conditions: SQL[] = [eq(products.status, ACTIVE)];
  if (input.search) {
    conditions.push(or(ilike(products.name, `%${input.search}%`), ilike(products.shortDescription, `%${input.search}%`))!);
  }
  if (input.category) {
    const cat = await db.query.categories.findFirst({ where: (t, { eq: e }) => e(t.slug, input.category!) });
    if (cat) conditions.push(eq(products.categoryId, cat.id));
  }

  // Min/max price and duration are applied by filtering joined results.
  const rows = await db
    .select({ product: products, plan: plans })
    .from(products)
    .leftJoin(plans, eq(plans.productId, products.id))
    .where(and(...conditions))
    .orderBy(desc(products.isFeatured), desc(products.sortOrder));

  // Post-filter price/duration (plans may be null).
  let filtered = rows;
  if (input.minPrice != null) filtered = filtered.filter((r) => r.plan && r.plan.priceLocal >= input.minPrice!);
  if (input.maxPrice != null) filtered = filtered.filter((r) => r.plan && r.plan.priceLocal <= input.maxPrice!);
  if (input.durationDays != null) filtered = filtered.filter((r) => r.plan && r.plan.durationDays === input.durationDays!);

  const groups = new Map<number, { product: typeof products.$inferSelect; plans: PublicPlan[] }>();
  for (const row of filtered) {
    const existing = groups.get(row.product.id);
    if (existing) {
      if (row.plan && row.plan.isActive) {
        existing.plans.push(mapPlan(row.plan));
      }
    } else {
      groups.set(row.product.id, {
        product: row.product,
        plans: row.plan && row.plan.isActive ? [mapPlan(row.plan)] : [],
      });
    }
  }

  let items = Array.from(groups.values());
  if (input.sort === "price_asc") items.sort((a, b) => minPrice(a.plans) - minPrice(b.plans));
  else if (input.sort === "price_desc") items.sort((a, b) => minPrice(b.plans) - minPrice(a.plans));
  else if (input.sort === "newest") items.sort((a, b) => b.product.createdAt.getTime() - a.product.createdAt.getTime());
  // "popular" default: featured first, then sortOrder.

  const total = items.length;
  const page = Math.floor((input.offset ?? 0) / (input.limit ?? 12)) + 1;
  const sliced = items.slice(input.offset ?? 0, (input.offset ?? 0) + (input.limit ?? 12));

  return { items: sliced.map((g) => mapProduct(g.product, g.plans)), total, page, pageSize: input.limit ?? 12 };
}

function minPrice(plans: PublicPlan[]): number {
  return plans.length ? Math.min(...plans.map((p) => p.priceLocal)) : 0;
}

export async function getProductBySlug(slug: string): Promise<PublicProduct> {
  const product = await db.query.products.findFirst({ where: (t, { eq: e }) => e(t.slug, slug) });
  if (!product || product.status !== ACTIVE) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");

  const planRows = await db
    .select()
    .from(plans)
    .where(and(eq(plans.productId, product.id), eq(plans.isActive, true)))
    .orderBy(asc(plans.sortOrder), asc(plans.priceLocal));

  const category = product.categoryId
    ? await db.query.categories.findFirst({ where: (t, { eq: e }) => e(t.id, product.categoryId!) })
    : null;

  const reviewSummary = await getReviewSummary(product.id);

  return mapProduct(product, planRows.map(mapPlan), category, reviewSummary);
}

export async function getFeaturedProducts(limit = 8): Promise<PublicProduct[]> {
  const rows = await db.query.products.findMany({
    where: (t, { and: a, eq: e }) => a(e(t.status, ACTIVE), e(t.isFeatured, true)),
    limit,
  });
  return Promise.all(rows.map((p) => getProductBySlug(p.slug)));
}

function mapPlan(p: typeof plans.$inferSelect): PublicPlan {
  return {
    id: p.id,
    name: p.name,
    durationDays: p.durationDays,
    priceLocal: p.priceLocal,
    priceUsd: p.priceUsd,
    currency: p.currency,
    description: p.description,
  };
}

function mapProduct(
  p: typeof products.$inferSelect,
  planList: PublicPlan[],
  category?: { id: number; name: string; slug: string; description: string | null; image: string | null; icon: string | null } | null,
  reviewSummary?: { average: number; count: number },
): PublicProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    shortDescription: p.shortDescription,
    categoryId: p.categoryId,
    category: category as PublicProduct["category"],
    imageUrl: p.imageUrl,
    logoUrl: p.logoUrl,
    logoUrlDark: p.logoUrlDark,
    features: p.features,
    providerName: p.providerName,
    isVerified: p.isVerified,
    eligibilityNote: p.eligibilityNote,
    isFeatured: p.isFeatured,
    plans: planList,
    minPrice: planList.length ? Math.min(...planList.map((x) => x.priceLocal)) : 0,
    maxPrice: planList.length ? Math.max(...planList.map((x) => x.priceLocal)) : 0,
    reviewSummary,
  };
}

/* --------------------------------- Reviews -------------------------------- */

export async function listPublishedReviews(productId: number, limit = 10): Promise<PublicReview[]> {
  const rows = await db
    .select({ review: reviews, userName: users.name })
    .from(reviews)
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "PUBLISHED")))
    .orderBy(desc(reviews.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.review.id,
    rating: r.review.rating,
    comment: r.review.comment,
    userName: r.userName ?? "Customer",
    createdAt: r.review.createdAt.toISOString(),
  }));
}

export async function getReviewSummary(productId: number): Promise<{ average: number; count: number }> {
  const rows = await db
    .select({ rating: reviews.rating })
    .from(reviews)
    .where(and(eq(reviews.productId, productId), eq(reviews.status, "PUBLISHED")));
  if (rows.length === 0) return { average: 0, count: 0 };
  const sum = rows.reduce((acc, r) => acc + r.rating, 0);
  return { average: Number((sum / rows.length).toFixed(1)), count: rows.length };
}

export async function canReview(userId: string, productId: number): Promise<boolean> {
  const fulfilled = await db.query.orders.findFirst({
    where: (t, { and: a, eq: e }) => a(e(t.productId, productId), e(t.userId, userId), e(t.status, "FULFILLED")),
  });
  return Boolean(fulfilled);
}

/* ---------------------------------- Blog ---------------------------------- */

export async function listPublishedBlog(input: { limit?: number; offset?: number }) {
  const conditions = [eq(blogPosts.status, "PUBLISHED")];
  const rows = await db
    .select()
    .from(blogPosts)
    .where(and(...conditions))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(input.limit ?? 12)
    .offset(input.offset ?? 0);
  const totalRow = await db.select({ value: count() }).from(blogPosts).where(and(...conditions));
  const items: PublicBlogPost[] = rows.map(mapBlog);
  return { items, total: totalRow[0]?.value ?? 0 };
}

function mapBlog(b: typeof blogPosts.$inferSelect): PublicBlogPost {
  return {
    id: b.id,
    title: b.title,
    slug: b.slug,
    excerpt: b.excerpt,
    coverImage: b.coverImage,
    category: b.category,
    tags: b.tags,
    publishedAt: b.publishedAt ? b.publishedAt.toISOString() : null,
  };
}

export async function getPublishedBlogBySlug(slug: string): Promise<PublicBlogPostDetail> {
  const row = await db.query.blogPosts.findFirst({ where: (t, { eq: e }) => e(t.slug, slug) });
  if (!row || row.status !== "PUBLISHED") throw new ApiError(404, "POST_NOT_FOUND", "Post not found.");
  return { ...mapBlog(row), content: row.content, seoTitle: row.seoTitle, seoDescription: row.seoDescription };
}

/* ----------------------------------- FAQ ---------------------------------- */

export async function listPublishedFaqs(): Promise<PublicFaq[]> {
  const rows = await db.query.faqItems.findMany({
    where: (t, { eq: e }) => e(t.isActive, true),
    orderBy: [asc(faqItems.sortOrder)],
  });
  return rows.map((r) => ({
    id: r.id,
    question: r.question,
    answer: r.answer,
    category: r.category,
    isFeatured: r.isFeatured,
  }));
}