import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { subscriptions, products, orders } from "../db/schema.js";
import { notify, notifyAdmins } from "./notifications.js";
import { getSettings } from "../lib/settings.js";
import { deriveStatus, remainingDays } from "./subscriptions.js";

const EXPIRY_BUCKETS = [
  { days: 7, label: "7 days", pref: "expiry7d" },
  { days: 3, label: "3 days", pref: "expiry3d" },
  { days: 1, label: "1 day", pref: "expiry1d" },
] as const;

export interface ExpiryJobResult {
  checked: number;
  expired: number;
  expiringSoon: number;
  notificationsCreated: number;
}

/**
 * Scheduled job (invoked by the cron route or the CLI script).
 * 1. Recomputes status from dates.
 * 2. Marks expired subscriptions EXPIRED (+ renewal pending where renewable).
 * 3. Creates expiring-soon notifications (deduplicated).
 * 4. Alerts admins when attention is required.
 * Never creates duplicate notifications (dedup keys).
 */
export async function runExpiryJob(): Promise<ExpiryJobResult> {
  const settings = await getSettings().catch(() => null);

  const all = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      subscriptionNumber: subscriptions.subscriptionNumber,
      expiryDate: subscriptions.expiryDate,
      status: subscriptions.status,
      renewalStatus: subscriptions.renewalStatus,
      productId: subscriptions.productId,
    })
    .from(subscriptions)
    .where(inArray(subscriptions.status, ["ACTIVE", "EXPIRING_SOON"]));

  const result: ExpiryJobResult = { checked: all.length, expired: 0, expiringSoon: 0, notificationsCreated: 0 };

  const productRows = await db.select().from(products);
  const nameOf = (id: number) => productRows.find((p) => p.id === id)?.name ?? "Subscription";

  const prefs = settings?.notifications ?? { expiry7d: true, expiry3d: true, expiry1d: true, expired: true };

  for (const sub of all) {
    const remaining = remainingDays(sub.expiryDate);
    const derived = deriveStatus(sub.expiryDate, sub.status);

    if (derived === "EXPIRED") {
      const renewal = sub.renewalStatus === "RENEWABLE" ? "RENEWAL_PENDING" : sub.renewalStatus;
      await db
        .update(subscriptions)
        .set({ status: "EXPIRED", renewalStatus: renewal as never, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
      result.expired += 1;

      if (prefs.expired) {
        await notify({
          userId: sub.userId,
          kind: "SUBSCRIPTION",
          title: "Subscription expired",
          body: `${nameOf(sub.productId)} expired on ${sub.expiryDate}. Renew to keep access.`,
          link: `/dashboard/subscriptions/${sub.id}`,
          dedupKey: `sub-expired-${sub.id}`,
        });
        await notifyAdmins(
          "Subscription expired",
          `${nameOf(sub.productId)} #${sub.subscriptionNumber} expired. Renewal required.`,
          `/admin/subscriptions/${sub.id}`,
          "SUBSCRIPTION",
          `admin-sub-expired-${sub.id}`,
        );
        result.notificationsCreated += 2;
      }
      continue;
    }

    if (derived === "EXPIRING_SOON" && sub.status !== "EXPIRING_SOON") {
      await db
        .update(subscriptions)
        .set({ status: "EXPIRING_SOON", updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
      result.expiringSoon += 1;
    }

    for (const bucket of EXPIRY_BUCKETS) {
      if (remaining !== bucket.days) continue;
      if (!prefs[bucket.pref]) continue;
      await notify({
        userId: sub.userId,
        kind: "SUBSCRIPTION",
        title: `Expires in ${bucket.label}`,
        body: `${nameOf(sub.productId)} expires on ${sub.expiryDate}.`,
        link: `/dashboard/subscriptions/${sub.id}`,
        dedupKey: `sub-exp-${bucket.days}-${sub.id}`,
      });
      await notifyAdmins(
        "Subscription expiring",
        `${nameOf(sub.productId)} #${sub.subscriptionNumber} expires in ${bucket.label}.`,
        `/admin/subscriptions/${sub.id}`,
        "SUBSCRIPTION",
        `admin-sub-exp-${bucket.days}-${sub.id}`,
      );
      result.notificationsCreated += 2;
    }
  }

  return result;
}

/** Expire orders that were never paid and whose payment window has passed. */
export async function expireStaleOrders(): Promise<number> {
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "PENDING_PAYMENT"), lt(orders.expiresAt, new Date())));

  if (stale.length === 0) return 0;
  await db
    .update(orders)
    .set({ status: "EXPIRED", updatedAt: new Date() })
    .where(and(eq(orders.status, "PENDING_PAYMENT"), lt(orders.expiresAt, new Date())));
  return stale.length;
}