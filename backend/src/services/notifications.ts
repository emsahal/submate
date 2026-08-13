import { and, desc, eq, inArray, isNull, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { notifications, users } from "../db/schema.js";
import { sendEmail } from "./email.js";

export interface NotifyInput {
  userId: string;
  kind?: "ORDER" | "PAYMENT" | "SUBSCRIPTION" | "SYSTEM" | "ADMIN";
  title: string;
  body: string;
  link?: string;
  /** Prevent duplicates when the same key already exists. */
  dedupKey?: string;
}

/** Create an in-app notification. If dedupKey exists, the insert is skipped. */
export async function notify(input: NotifyInput): Promise<void> {
  if (input.dedupKey) {
    const existing = await db.query.notifications.findFirst({
      where: (t, { and: a, eq: e }) => a(e(t.dedupKey, input.dedupKey!), e(t.userId, input.userId)),
    });
    if (existing) return;
  }
  try {
    await db.insert(notifications).values({
      userId: input.userId,
      kind: input.kind ?? "SYSTEM",
      title: input.title,
      body: input.body,
      link: input.link ?? null,
      dedupKey: input.dedupKey ?? null,
    });
  } catch (error) {
    // Unique constraint on dedupKey can race; treat as a silent duplicate.
    if ((error as { code?: string })?.code === "23505") return;
    console.error("[notify] failed to create notification", error);
  }
  await emailNotification(input);
}

/** Best-effort email mirror of an in-app notification via Resend. */
async function emailNotification(input: NotifyInput): Promise<void> {
  try {
    const row = await db.select({ email: users.email }).from(users).where(eq(users.id, input.userId)).limit(1);
    const to = row[0]?.email;
    if (!to) return;
    const link = input.link?.startsWith("http")
      ? input.link
      : input.link
        ? `${process.env.FRONTEND_URL ?? "http://localhost:3000"}${input.link}`
        : undefined;
    await sendEmail({ to, subject: input.title, title: input.title, body: input.body, link });
  } catch (error) {
    console.error("[email] failed to mail notification", error);
  }
}

/** Notify every admin. Used for payments awaiting review and expiry alerts. */
export async function notifyAdmins(
  title: string,
  body: string,
  link?: string,
  kind: "ORDER" | "PAYMENT" | "SUBSCRIPTION" | "SYSTEM" | "ADMIN" = "SYSTEM",
  dedupKey?: string,
): Promise<void> {
  const admins = await db.select().from(users).where(eq(users.role, "ADMIN"));
  await Promise.all(
    admins.map((a) => notify({ userId: a.id, kind, title, body, link, dedupKey })),
  );
}

export async function unreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ value: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return rows.length;
}

export async function listForUser(userId: string, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markRead(userId: string, id: number): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

/** Delete read notifications older than N days. */
export async function pruneRead(olderThanDays = 30): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await db
    .delete(notifications)
    .where(lt(notifications.readAt, cutoff));
  return Number(result?.rowCount ?? 0);
}