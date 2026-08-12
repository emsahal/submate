import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  orders,
  products,
  plans,
  paymentMethods,
  users,
} from "../db/schema.js";
import { generateOrderNumber } from "../lib/numbers.js";
import { getSetting } from "../lib/settings.js";
import { notify } from "./notifications.js";
import { logAudit } from "../lib/audit.js";
import { ApiError } from "../lib/errors.js";
import { paymentDetailsForOrder } from "./payments.js";
import type { OrderDetail } from "@shared/types.js";

const ORDER_DETAIL_SELECT = {
  id: orders.id,
  orderNumber: orders.orderNumber,
  productId: orders.productId,
  productName: orders.productName,
  planId: orders.planId,
  planName: orders.planName,
  planDurationDays: orders.planDurationDays,
  amount: orders.amount,
  currency: orders.currency,
  screens: orders.screens,
  status: orders.status,
  submittedAt: orders.submittedAt,
  approvedAt: orders.approvedAt,
  fulfilledAt: orders.fulfilledAt,
  expiresAt: orders.expiresAt,
  createdAt: orders.createdAt,
  productSlug: products.slug,
} as const;

export async function createOrder(input: {
  userId: string;
  productId: number;
  planId: number;
  screens?: number;
  paymentMethodId?: number;
  ip?: string;
}): Promise<OrderDetail> {
  const product = await db.query.products.findFirst({
    where: (t, { eq: e }) => e(t.id, input.productId),
  });
  if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found.");
  if (product.status !== "ACTIVE") {
    throw new ApiError(400, "PRODUCT_UNAVAILABLE", "This product is not currently available.");
  }

  const plan = await db.query.plans.findFirst({
    where: (t, { eq: e, and: a }) => a(e(t.id, input.planId), e(t.productId, input.productId)),
  });
  if (!plan) throw new ApiError(404, "PLAN_NOT_FOUND", "Plan not found for this product.");
  if (!plan.isActive) throw new ApiError(400, "PLAN_UNAVAILABLE", "This plan is not currently available.");

  let methodId: number | null = null;
  if (input.paymentMethodId) {
    const method = await db.query.paymentMethods.findFirst({
      where: (t, { eq: e, and: a }) => a(e(t.id, input.paymentMethodId!), e(t.isActive, true)),
    });
    if (!method) throw new ApiError(400, "PAYMENT_METHOD_INVALID", "Selected payment method is not available.");
    methodId = method.id;
  }

  const screens = Math.min(Math.max(Math.round(input.screens ?? 1), 1), 5);
  const totalAmount = plan.priceLocal * screens;

  const expiryHours = await getSettingOrderExpiryHours();
  const orderNumber = await produceUniqueOrderNumber();

  const inserted = await db
    .insert(orders)
    .values({
      orderNumber,
      userId: input.userId,
      productId: product.id,
      planId: plan.id,
      productName: product.name,
      planName: plan.name,
      planDurationDays: plan.durationDays,
      amount: totalAmount,
      currency: plan.currency || "PKR",
      screens,
      paymentMethodId: methodId,
      status: "PENDING_PAYMENT",
      expiresAt: new Date(Date.now() + expiryHours * 60 * 60 * 1000),
    })
    .returning();
  const order = inserted[0];
  if (!order) throw new ApiError(500, "ORDER_CREATE_FAILED", "Could not create the order.");

  const screensLabel = screens > 1 ? ` (${screens} screens)` : "";
  await notify({
    userId: input.userId,
    kind: "ORDER",
    title: "Order created",
    body: `Order ${orderNumber} for ${product.name} (${plan.name})${screensLabel} has been created.`,
    link: `/dashboard/orders/${order.id}`,
  });

  void logAudit({
    actorId: input.userId,
    actorRole: "USER",
    action: "order.created",
    targetType: "order",
    targetId: String(order.id),
    ip: input.ip,
    meta: { orderNumber, amount: totalAmount, currency: plan.currency, screens },
  });

  return getOrderDetailForUser(input.userId, order.id);
}

async function getSettingOrderExpiryHours(): Promise<number> {
  try {
    const s = await getSetting("order");
    return s.pendingExpiryHours;
  } catch {
    return 48;
  }
}

async function produceUniqueOrderNumber(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = generateOrderNumber();
    const existing = await db.query.orders.findFirst({
      where: (t, { eq: e }) => e(t.orderNumber, candidate),
    });
    if (!existing) return candidate;
  }
  throw new ApiError(500, "ORDER_NUMBER_EXHAUSTED", "Could not allocate an order number, please retry.");
}

export async function cancelOrder(input: { userId: string; orderId: number; reason?: string; ip?: string }): Promise<OrderDetail> {
  const order = await db.query.orders.findFirst({
    where: (t, { eq: e, and: a }) => a(e(t.id, input.orderId), e(t.userId, input.userId)),
  });
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  if (!["PENDING_PAYMENT"].includes(order.status)) {
    throw new ApiError(400, "ORDER_CANNOT_CANCEL", "Only orders pending payment can be cancelled.");
  }
  await db
    .update(orders)
    .set({ status: "CANCELLED", cancelledAt: new Date(), updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await notify({
    userId: input.userId,
    kind: "ORDER",
    title: "Order cancelled",
    body: `Order ${order.orderNumber} was cancelled.`,
    link: `/dashboard/orders/${order.id}`,
  });

  void logAudit({
    actorId: input.userId,
    actorRole: "USER",
    action: "order.cancelled",
    targetType: "order",
    targetId: String(order.id),
    ip: input.ip,
    meta: { reason: input.reason, orderNumber: order.orderNumber },
  });

  return getOrderDetailForUser(input.userId, order.id);
}

export async function listUserOrders(userId: string, limit = 20) {
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      productId: orders.productId,
      productSlug: products.slug,
      productName: orders.productName,
      planName: orders.planName,
      amount: orders.amount,
      currency: orders.currency,
      status: orders.status,
      createdAt: orders.createdAt,
      submittedAt: orders.submittedAt,
      fulfilledAt: orders.fulfilledAt,
    })
    .from(orders)
    .innerJoin(products, eq(products.id, orders.productId))
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
}

export async function getOrderDetailForUser(userId: string, orderId: number): Promise<OrderDetail> {
  const rows = await db
    .select(ORDER_DETAIL_SELECT)
    .from(orders)
    .innerJoin(products, eq(products.id, orders.productId))
    .leftJoin(plans, eq(plans.id, orders.planId))
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);

  const row = rows[0];
  if (!row) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");

  const methodRows = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))
    .orderBy(desc(paymentMethods.sortOrder));

  const paymentList = await paymentDetailsForOrder(orderId);
  const lastPayment = paymentList[0] ?? null;
  const hasScreenshotUploadPending = row.status === "PENDING_PAYMENT";

  return {
    id: row.id,
    orderNumber: row.orderNumber,
    productId: row.productId,
    productSlug: row.productSlug,
    productName: row.productName,
    planId: row.planId,
    planName: row.planName,
    planDurationDays: row.planDurationDays,
    amount: row.amount,
    currency: row.currency,
    screens: row.screens ?? 1,
    status: row.status,
    submittedAt: fmt(row.submittedAt),
    approvedAt: fmt(row.approvedAt),
    fulfilledAt: fmt(row.fulfilledAt),
    expiresAt: fmt(row.expiresAt),
    createdAt: fmt(row.createdAt) ?? "",
    payments: paymentList,
    payment: lastPayment,
    paymentMethods: methodRows as unknown as OrderDetail["paymentMethods"],
    canSubmitPayment: hasScreenshotUploadPending,
  };
}

function fmt(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

/** Admin view (no user-scoping). */
export async function getOrderForAdmin(orderId: number) {
  return getOrderDetailForUserOrAdmin(orderId);
}

async function getOrderDetailForUserOrAdmin(orderId: number) {
  const rows = await db
    .select({
      ...ORDER_DETAIL_SELECT,
      userId: orders.userId,
      userName: users.name,
      userEmail: users.email,
      adminNote: orders.adminNote,
      productDescription: products.description,
      productSlug: products.slug,
    })
    .from(orders)
    .innerJoin(products, eq(products.id, orders.productId))
    .leftJoin(plans, eq(plans.id, orders.planId))
    .leftJoin(users, eq(users.id, orders.userId))
    .where(eq(orders.id, orderId))
    .limit(1);

  const row = rows[0];
  if (!row) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");

  const paymentRows = await paymentDetailsForOrder(orderId);

  const methods = await db
    .select()
    .from(paymentMethods)
    .where(eq(paymentMethods.isActive, true))
    .orderBy(desc(paymentMethods.sortOrder));

  const detail: OrderDetail = {
    id: row.id,
    orderNumber: row.orderNumber,
    productId: row.productId,
    productSlug: row.productSlug,
    productName: row.productName,
    planId: row.planId,
    planName: row.planName,
    planDurationDays: row.planDurationDays,
    amount: row.amount,
    currency: row.currency,
    screens: row.screens ?? 1,
    status: row.status,
    submittedAt: fmt(row.submittedAt),
    approvedAt: fmt(row.approvedAt),
    fulfilledAt: fmt(row.fulfilledAt),
    expiresAt: fmt(row.expiresAt),
    createdAt: fmt(row.createdAt) ?? "",
    payments: paymentRows,
    payment: paymentRows[0] ?? null,
    paymentMethods: methods,
    canSubmitPayment: false,
  };

  return {
    ...detail,
    userId: row.userId,
    user: { id: row.userId, name: row.userName ?? "", email: row.userEmail ?? "" },
    adminNote: row.adminNote,
  };
}

export async function listOrdersForAdmin(opts: { status?: string; userId?: string; limit?: number; offset?: number }) {
  const conditions = [];
  if (opts.status) conditions.push(eq(orders.status, opts.status as never));
  if (opts.userId) conditions.push(eq(orders.userId, opts.userId));
  const where = conditions.length ? and(...conditions) : undefined;

  const items = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      userId: orders.userId,
      username: users.name,
      userEmail: users.email,
      productName: orders.productName,
      planName: orders.planName,
      amount: orders.amount,
      currency: orders.currency,
      status: orders.status,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(where)
    .orderBy(desc(orders.createdAt))
    .limit(opts.limit ?? 30)
    .offset(opts.offset ?? 0);

  const totalRow = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(orders)
    .where(where);

  return { items, total: totalRow[0]?.value ?? 0 };
}