import { and, count, desc, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  orders,
  plans,
  products,
  subscriptions,
  accessCredentials,
  subscriptionSlots,
  users,
  accountInventory,
} from "../db/schema.js";
import { generateSubscriptionNumber } from "../lib/numbers.js";
import { encryptPayload, decryptPayload } from "../lib/crypto.js";
import { notify } from "./notifications.js";
import { logAdminAction, logAudit } from "../lib/audit.js";
import { ApiError } from "../lib/errors.js";
import { getOtpStatus } from "./otp.js";
import type { SubscriptionDetail, SubscriptionStatus } from "@shared/types.js";

export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Status derivation for a subscription based purely on dates. */
export function deriveStatus(expiryDate: string, current: SubscriptionStatus): SubscriptionStatus {
  if (current === "SUSPENDED" || current === "CANCELLED") return current;
  const today = todayString();
  const diffDays = Math.floor((new Date(expiryDate + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86_400_000);
  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= 7 && diffDays >= 0) return "EXPIRING_SOON";
  return "ACTIVE";
}

export function remainingDays(expiryDate: string): number {
  const today = todayString();
  return Math.floor((new Date(expiryDate + "T00:00:00Z").getTime() - new Date(today + "T00:00:00Z").getTime()) / 86_400_000);
}

/** User confirms they received access to their subscription. */
export async function confirmSubscriptionReceived(input: { userId: string; subscriptionId: number; ip?: string }) {
  const sub = await db.query.subscriptions.findFirst({
    where: (t, { and: a, eq: e }) => a(e(t.id, input.subscriptionId), e(t.userId, input.userId)),
  });
  if (!sub) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.");
  if (sub.status === "CANCELLED" || sub.status === "SUSPENDED") {
    throw new ApiError(400, "SUBSCRIPTION_CLOSED", "This subscription is no longer active.");
  }

  if (!sub.userConfirmedAt) {
    await db
      .update(subscriptions)
      .set({ userConfirmedAt: new Date(), updatedAt: new Date() })
      .where(eq(subscriptions.id, sub.id));
    void logAudit({ actorId: input.userId, actorRole: "USER", action: "subscription.receipt-confirmed", targetType: "subscription", targetId: String(sub.id), ip: input.ip });
  }

  return { ...sub, userConfirmedAt: sub.userConfirmedAt ?? new Date() };
}

/** Fulfill an approved order → create one active subscription per screen. */
export async function fulfillOrder(input: { adminId: string; orderId: number; notes?: string; ip?: string }) {
  const order = await db.query.orders.findFirst({ where: (t, { eq: e }) => e(t.id, input.orderId) });
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");
  if (order.status !== "APPROVED") {
    throw new ApiError(400, "ORDER_NOT_APPROVED", "Only approved orders can be fulfilled.");
  }

  const hasSub = await db.query.subscriptions.findFirst({
    where: (t, { eq: e }) => e(t.orderId, order.id),
  });
  if (hasSub) throw new ApiError(400, "ALREADY_FULFILLED", "This order has already been fulfilled.");

  const screens = Math.min(Math.max(order.screens ?? 1, 1), 5);
  const start = todayString();
  const expiry = addDays(start, order.planDurationDays);

  const createdSubs: (typeof subscriptions.$inferSelect)[] = [];

  for (let i = 1; i <= screens; i++) {
    const subNumber = await generateUniqueSubNumber();
    const screenNote =
      screens > 1
        ? [input.notes, `Screen ${i} of ${screens}`].filter(Boolean).join(" · ")
        : input.notes;

    // Find an available account in the pool for this product
    const inventory = await db.query.accountInventory.findFirst({
      where: (t, { eq: e, and: a, lt: l }) =>
        a(e(t.productId, order.productId), e(t.status, "ACTIVE"), l(t.usedSlots, t.maxSlots)),
    });

    let inventoryAccountId: number | null = null;
    let allocatedProfileName: string | null = null;

    if (inventory) {
      inventoryAccountId = inventory.id;
      allocatedProfileName = `Profile ${inventory.usedSlots + 1}`;
    }

    const inserted = await db
      .insert(subscriptions)
      .values({
        subscriptionNumber: subNumber,
        userId: order.userId,
        productId: order.productId,
        planId: order.planId,
        orderId: order.id,
        inventoryAccountId,
        allocatedProfileName,
        startDate: start,
        expiryDate: expiry,
        status: "ACTIVE",
        renewalStatus: "RENEWABLE",
        notes: screenNote,
      })
      .returning();
    const subscription = inserted[0];
    if (!subscription) throw new ApiError(500, "SUBSCRIPTION_CREATE_FAILED", `Could not create subscription for screen ${i}.`);
    createdSubs.push(subscription);

    // If allocated, create access credentials and update slot count
    if (inventory && subscription) {
      try {
        const decryptedPassword = decryptPayload(inventory.encryptedPassword, inventory.encryptionIv, inventory.keyVersion);

        // Save the credentials automatically
        const payloadStr = `${inventory.email}:${decryptedPassword}`;
        const { ciphertext, iv, keyVersion } = encryptPayload(payloadStr);

        await db
          .insert(accessCredentials)
          .values({
            subscriptionId: subscription.id,
            type: "GENERIC",
            encryptedPayload: ciphertext,
            encryptionIv: iv,
            keyVersion,
            publicMeta: { assignedEmail: inventory.email },
            notes: "Auto-allocated from email pool",
            createdBy: input.adminId,
          });

        // Update inventory slot usage
        const newUsedSlots = inventory.usedSlots + 1;
        const newStatus = newUsedSlots >= inventory.maxSlots ? "FULL" : "ACTIVE";

        await db
          .update(accountInventory)
          .set({
            usedSlots: newUsedSlots,
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(accountInventory.id, inventory.id));

      } catch (err) {
        console.error(`[subscriptions] Auto-credential creation failed for sub #${subscription.id}:`, err);
      }
    }
  }

  await db
    .update(orders)
    .set({ status: "FULFILLED", fulfilledAt: new Date(), adminId: input.adminId, updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  const product = await db.query.products.findFirst({ where: (t, { eq: e }) => e(t.id, order.productId) });
  const firstSub = createdSubs[0]!;

  const bodyMsg =
    screens > 1
      ? `Your ${product?.name ?? "subscription"} (${screens} screens) is now active. Expires on ${expiry}.`
      : `Your ${product?.name ?? "subscription"} is now active. Expires on ${expiry}.`;

  await notify({
    userId: order.userId,
    kind: "SUBSCRIPTION",
    title: "Subscription activated",
    body: bodyMsg,
    link: `/dashboard/subscriptions/${firstSub.id}`,
  });

  void logAdminAction({
    adminId: input.adminId,
    action: "order.fulfilled",
    detail: `${screens} subscription(s) created (${start} → ${expiry})`,
    orderId: order.id,
    subscriptionId: firstSub.id,
    notes: input.notes,
  });
  void logAudit({
    actorId: input.adminId,
    actorRole: "ADMIN",
    action: "order.fulfilled",
    targetType: "order",
    targetId: String(order.id),
    ip: input.ip,
    meta: { screens, orderNumber: order.orderNumber, expiry },
  });

  return firstSub;
}


async function generateUniqueSubNumber(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = generateSubscriptionNumber();
    const existing = await db.query.subscriptions.findFirst({
      where: (t, { eq: e }) => e(t.subscriptionNumber, candidate),
    });
    if (!existing) return candidate;
  }
  throw new ApiError(500, "SUB_NUMBER_EXHAUSTED", "Could not allocate a subscription number.");
}

/** Store an encrypted access delivery record for a subscription. */
export async function setAccessCredential(input: {
  adminId: string;
  subscriptionId: number;
  type: "PROVIDER_LINK" | "LICENSE_KEY" | "REDEEM_CODE" | "ACCESS_URL" | "BULK_ACCESS" | "GENERIC";
  sensitivePayload: string;
  publicMeta?: Record<string, string>;
  notes?: string;
}) {
  const sub = await db.query.subscriptions.findFirst({ where: (t, { eq: e }) => e(t.id, input.subscriptionId) });
  if (!sub) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.");

  const { ciphertext, iv, keyVersion } = encryptPayload(input.sensitivePayload);

  await db
    .insert(accessCredentials)
    .values({
      subscriptionId: sub.id,
      type: input.type,
      encryptedPayload: ciphertext,
      encryptionIv: iv,
      keyVersion,
      publicMeta: input.publicMeta ?? {},
      notes: input.notes,
      createdBy: input.adminId,
    })
    .onConflictDoUpdate({
      target: accessCredentials.subscriptionId,
      set: {
        type: input.type,
        encryptedPayload: ciphertext,
        encryptionIv: iv,
        keyVersion,
        publicMeta: input.publicMeta ?? {},
        notes: input.notes,
        updatedAt: new Date(),
      },
    });

  void logAdminAction({
    adminId: input.adminId,
    action: "subscription.access-credential-set",
    detail: `Credential updated for subscription #${sub.subscriptionNumber}`,
    subscriptionId: sub.id,
    notes: input.notes,
  });
  void logAudit({ actorId: input.adminId, actorRole: "ADMIN", action: "subscription.credential-set", targetType: "subscription", targetId: String(sub.id) });
}

/* ------------------------------ Renewal ------------------------------ */

/** Renew: extend expiry from max(previous expiry, today). */
export async function renewSubscription(input: { adminId: string; subscriptionId: number; action?: "RENEW"; note?: string }) {
  const sub = await db.query.subscriptions.findFirst({ where: (t, { eq: e }) => e(t.id, input.subscriptionId) });
  if (!sub) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.");
  if (sub.status === "SUSPENDED" || sub.status === "CANCELLED") {
    throw new ApiError(400, "SUBSCRIPTION_CLOSED", "Suspended or cancelled subscriptions cannot be renewed.");
  }

  const plan = await db.query.plans.findFirst({ where: (t, { eq: e }) => e(t.id, sub.planId) });
  if (!plan) throw new ApiError(404, "PLAN_NOT_FOUND", "Plan not found for renewal length.");

  const base = remainingDays(sub.expiryDate) >= 0 ? sub.expiryDate : todayString();
  const newExpiry = addDays(base, plan.durationDays);

  await db
    .update(subscriptions)
    .set({
      expiryDate: newExpiry,
      status: deriveStatus(newExpiry, sub.status),
      renewalStatus: "RENEWED",
      notes: input.note ?? sub.notes,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, sub.id));

  const product = await db.query.products.findFirst({ where: (t, { eq: e }) => e(t.id, sub.productId) });
  await notify({
    userId: sub.userId,
    kind: "SUBSCRIPTION",
    title: "Subscription renewed",
    body: `${product?.name ?? "Your subscription"} renewed until ${newExpiry}.`,
    link: `/dashboard/subscriptions/${sub.id}`,
  });

  void logAdminAction({ adminId: input.adminId, action: "subscription.renewed", detail: `${sub.subscriptionNumber} → ${newExpiry}`, subscriptionId: sub.id, notes: input.note });
  void logAudit({ actorId: input.adminId, actorRole: "ADMIN", action: "subscription.renewed", targetType: "subscription", targetId: String(sub.id), meta: { newExpiry } });

  return { ...sub, expiryDate: newExpiry, status: deriveStatus(newExpiry, sub.status) };
}

export async function changeSubscriptionStatus(input: {
  adminId: string;
  subscriptionId: number;
  action: "SUSPEND" | "ACTIVATE" | "CANCEL";
  note?: string;
}) {
  const sub = await db.query.subscriptions.findFirst({ where: (t, { eq: e }) => e(t.id, input.subscriptionId) });
  if (!sub) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.");

  let next: SubscriptionStatus = sub.status;
  if (input.action === "SUSPEND") next = "SUSPENDED";
  if (input.action === "ACTIVATE") next = deriveStatus(sub.expiryDate, "ACTIVE");
  if (input.action === "CANCEL") next = "CANCELLED";

  await db
    .update(subscriptions)
    .set({ status: next, notes: input.note ?? sub.notes, updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));

  void logAdminAction({ adminId: input.adminId, action: `subscription.${input.action.toLowerCase()}`, subscriptionId: sub.id, notes: input.note });
  void logAudit({ actorId: input.adminId, actorRole: "ADMIN", action: `subscription.${input.action.toLowerCase()}`, targetType: "subscription", targetId: String(sub.id), meta: { subscriptionNumber: sub.subscriptionNumber } });
  return { ...sub, status: next };
}

/* ------------------------------ Listing ------------------------------ */

export async function listSubscriptionsForUser(userId: string, limit = 50): Promise<SubscriptionDetail[]> {
  const rows = await db
    .select({
      id: subscriptions.id,
      subscriptionNumber: subscriptions.subscriptionNumber,
      productId: subscriptions.productId,
      productSlug: products.slug,
      productName: products.name,
      productLogo: products.logoUrl,
      planId: subscriptions.planId,
      planName: plans.name,
      startDate: subscriptions.startDate,
      expiryDate: subscriptions.expiryDate,
      status: subscriptions.status,
      renewalStatus: subscriptions.renewalStatus,
      notes: subscriptions.notes,
      userConfirmedAt: subscriptions.userConfirmedAt,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.expiryDate))
    .limit(limit);

  return rows.map(serializeSubscription);
}

export async function getSubscriptionForUser(userId: string, subscriptionId: number) {
  const row = await db
    .select({
      id: subscriptions.id,
      subscriptionNumber: subscriptions.subscriptionNumber,
      productId: subscriptions.productId,
      productSlug: products.slug,
      productName: products.name,
      productLogo: products.logoUrl,
      planId: subscriptions.planId,
      planName: plans.name,
      startDate: subscriptions.startDate,
      expiryDate: subscriptions.expiryDate,
      status: subscriptions.status,
      renewalStatus: subscriptions.renewalStatus,
      notes: subscriptions.notes,
      userConfirmedAt: subscriptions.userConfirmedAt,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.userId, userId)))
    .limit(1);

  const first = row[0];
  if (!first) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.");

  const cred = await db.query.accessCredentials.findFirst({
    where: (t, { eq: e }) => e(t.subscriptionId, subscriptionId),
  });

  let access: string | null = null;
  let accessType: string | null = null;
  if (cred) {
    accessType = cred.type;
    try {
      access = decryptPayload(cred.encryptedPayload, cred.encryptionIv, cred.keyVersion);
    } catch (err) {
      console.error(`[subscriptions] failed to decrypt access for subscription #${subscriptionId}`, err);
    }
  }

  return {
    ...serializeSubscription(first),
    accessMeta: cred?.publicMeta ?? null,
    access,
    accessType,
    hasCredential: Boolean(cred),
    otp: await getOtpStatus(subscriptionId),
  };
}

export async function listSubscriptionsForAdmin(opts: { status?: string; userId?: string; limit?: number; offset?: number }) {
  const conditions = [];
  if (opts.status) conditions.push(eq(subscriptions.status, opts.status as never));
  if (opts.userId) conditions.push(eq(subscriptions.userId, opts.userId));

  const items = await db
    .select({
      id: subscriptions.id,
      subscriptionNumber: subscriptions.subscriptionNumber,
      userId: subscriptions.userId,
      userName: users.name,
      productId: subscriptions.productId,
      productName: products.name,
      planName: plans.name,
      startDate: subscriptions.startDate,
      expiryDate: subscriptions.expiryDate,
      status: subscriptions.status,
      renewalStatus: subscriptions.renewalStatus,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(products, eq(products.id, subscriptions.productId))
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .innerJoin(users, eq(users.id, subscriptions.userId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(subscriptions.expiryDate))
    .limit(opts.limit ?? 30)
    .offset(opts.offset ?? 0);

  const totalRow = await db.select({ value: count() }).from(subscriptions).where(conditions.length ? and(...conditions) : undefined);

  return { items, total: totalRow[0]?.value ?? 0 };
}

function serializeSubscription(row: {
  id: number;
  subscriptionNumber: string;
  productId: number;
  productSlug: string;
  productName: string;
  productLogo: string | null;
  planId: number;
  planName: string;
  startDate: string;
  expiryDate: string;
  status: SubscriptionStatus;
  renewalStatus: string;
  notes: string | null;
  userConfirmedAt: Date | null;
  createdAt: Date;
}): SubscriptionDetail {
  const remaining = remainingDays(row.expiryDate);
  const status = deriveStatus(row.expiryDate, row.status);
  return {
    id: row.id,
    subscriptionNumber: row.subscriptionNumber,
    productId: row.productId,
    productSlug: row.productSlug,
    productName: row.productName,
    productLogo: row.productLogo,
    planId: row.planId,
    planName: row.planName,
    startDate: row.startDate,
    expiryDate: row.expiryDate,
    status,
    renewalStatus: row.renewalStatus as SubscriptionDetail["renewalStatus"],
    notes: row.notes,
    userConfirmedAt: row.userConfirmedAt ? row.userConfirmedAt.toISOString() : null,
    remainingDays: remaining,
    isExpiringSoon: remaining >= 0 && remaining <= 7,
    isExpired: remaining < 0,
    createdAt: row.createdAt.toISOString(),
    accessMeta: null,
    access: null,
    accessType: null,
    hasCredential: false,
  };
}