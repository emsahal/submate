import { and, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, payments, subscriptions, reviews, users, products } from "../db/schema.js";
import { ApiError } from "../lib/errors.js";
import type { AdminDashboardStats } from "@shared/types.js";

function startOfDay(offsetDays = 0): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d;
}

const REVENUE_STATUSES = ["APPROVED", "FULFILLED"] as const;

export async function adminDashboardStats(): Promise<AdminDashboardStats> {
  const today = startOfDay(0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalOrders,
    pendingPayments,
    underReview,
    todayRevenue,
    monthRevenue,
    activeSubscriptions,
    expiringSoon,
    expired,
    pendingReviews,
    totalUsers,
    newToday,
    pendingPaymentWithAi,
  ] = await Promise.all([
    countRows(orders, undefined),
    countRows(orders, eq(orders.status, "PAYMENT_SUBMITTED")),
    countRows(orders, eq(orders.status, "UNDER_ADMIN_REVIEW")),
    sumRevenue(and(gte(orders.createdAt, today), inArray(orders.status, REVENUE_STATUSES))),
    sumRevenue(and(gte(orders.createdAt, monthStart), inArray(orders.status, REVENUE_STATUSES))),
    countRows(subscriptions, eq(subscriptions.status, "ACTIVE")),
    countRows(subscriptions, eq(subscriptions.status, "EXPIRING_SOON")),
    countRows(subscriptions, eq(subscriptions.status, "EXPIRED")),
    countRows(reviews, eq(reviews.status, "PENDING")),
    countRows(users, undefined),
    countRows(users, gte(users.createdAt, today)),
    countRows(payments, eq(payments.status, "AI_REVIEWED")),
  ]);

  /* Recent orders + payments for the activity feed */
  const recentOrders = await db
    .select()
    .from(orders)
    .orderBy(desc(orders.createdAt))
    .limit(6);

  // Revenue last 7 days (approved orders)
  const revenueLast7Days: { day: string; value: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const from = startOfDay(-i);
    const to = startOfDay(-i + 1);
    const value = await sumRevenue(and(gte(orders.createdAt, from), sql`${orders.createdAt} < ${to}`, inArray(orders.status, REVENUE_STATUSES)));
    revenueLast7Days.push({ day: from.toISOString().slice(0, 10), value });
  }

  const topProducts = await db
    .select({
      slug: products.slug,
      name: products.name,
      orders: count(orders.id).mapWith(Number),
      revenue: sql<number>`COALESCE(sum(${orders.amount}) filter (where ${orders.status} in ('APPROVED', 'FULFILLED')), 0)::int`,
    })
    .from(orders)
    .innerJoin(products, eq(products.id, orders.productId))
    .groupBy(products.id)
    .orderBy(desc(count(orders.id)))
    .limit(5);

  return {
    totalOrders,
    pendingPayments,
    underReview,
    todayRevenue,
    monthRevenue,
    activeSubscriptions,
    expiringSoon,
    expired,
    pendingReviews,
    totalUsers,
    newToday,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      user: { id: o.userId, name: "", email: "" },
      productName: o.productName,
      planName: o.planName,
      amount: o.amount,
      currency: o.currency,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
    recentPayments: [],
    revenueLast7Days,
    topProducts: topProducts.map((t) => ({ slug: t.slug, name: t.name, orders: t.orders, revenue: Number(t.revenue) })),
  };
}

async function countRows(table: any, condition?: SQL): Promise<number> {
  const base = db.select({ value: count() }).from(table);
  const rows = condition ? await base.where(condition) : await base;
  return (rows[0] as { value?: number } | undefined)?.value ?? 0;
}

async function sumRevenue(condition: any): Promise<number> {
  const rows = await db
    .select({ value: sql<number>`COALESCE(sum(${orders.amount}), 0)::int` })
    .from(orders)
    .where(condition);
  return rows[0]?.value ?? 0;
}

/* ------------------------------- User admin ------------------------------- */

export async function listAdminUsers(opts: { search?: string; limit?: number; offset?: number }) {
  const conditions = [];
  if (opts.search) {
    conditions.push(sql`lower(${users.name}) like lower(${"%" + opts.search + "%"}) or lower(${users.email}) like lower(${"%" + opts.search + "%"})`);
  }
  const items = await db
    .select()
    .from(users)
    .where(conditions.length ? and(...(conditions as never[])) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(opts.limit ?? 30)
    .offset(opts.offset ?? 0);
  const totalRow = await db.select({ value: count() }).from(users).where(conditions.length ? and(...(conditions as never[])) : undefined);
  return { items, total: totalRow[0]?.value ?? 0 };
}

export async function updateUserStatus(input: { adminId: string; userId: string; role?: "USER" | "ADMIN"; isSuspended?: boolean }) {
  const target = await db.query.users.findFirst({ where: (t, { eq: e }) => e(t.id, input.userId) });
  if (!target) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");

  const next: Partial<typeof users.$inferInsert> = {};
  if (input.role) next.role = input.role as never;
  if (input.isSuspended !== undefined) {
    next.isSuspended = input.isSuspended;
    next.suspendedAt = input.isSuspended ? new Date() : null;
  }

  await db.update(users).set({ ...next, updatedAt: new Date() }).where(eq(users.id, input.userId));

  void logAuditProxy(input.adminId, "user.status-updated", input.userId, { role: input.role, suspended: input.isSuspended });
  return { id: target.id, role: input.role ?? target.role, isSuspended: input.isSuspended ?? target.isSuspended };
}

/* ------------------------------- Review admin ------------------------------ */

export async function moderateReview(input: { adminId: string; reviewId: number; status: "PUBLISHED" | "HIDDEN" }) {
  const review = await db.query.reviews.findFirst({ where: (t, { eq: e }) => e(t.id, input.reviewId) });
  if (!review) throw new ApiError(404, "REVIEW_NOT_FOUND", "Review not found.");
  await db.update(reviews).set({ status: input.status, updatedAt: new Date() }).where(eq(reviews.id, review.id));
  return { id: review.id, status: input.status };
}

/* -------------------------------- Pending reviews ------------------------------- */

export async function listReviewsAdmin(opts: { status?: string; page?: number; pageSize?: number }) {
  const conditions = [];
  if (opts.status) conditions.push(eq(reviews.status, opts.status as never));
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const items = await db
    .select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      status: reviews.status,
      createdAt: reviews.createdAt,
      productName: products.name,
      userName: users.name,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .innerJoin(users, eq(users.id, reviews.userId))
    .where(conditions.length ? and(...(conditions as never[])) : undefined)
    .orderBy(desc(reviews.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const totalRow = await db.select({ value: count() }).from(reviews).where(conditions.length ? and(...(conditions as never[])) : undefined);
  return { items: items as never[], total: totalRow[0]?.value ?? 0, page, pageSize };
}

// Keep audit logs inline-importable without circular deps.
import { logAudit as logAuditProxyFn } from "../lib/audit.js";
function logAuditProxy(actorId: string, action: string, targetId: string, meta: Record<string, unknown>) {
  void logAuditProxyFn({ actorId, actorRole: "ADMIN", action, targetType: "user", targetId, meta });
}