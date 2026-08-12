import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { orders, payments, paymentScreenshots, paymentMethods } from "../db/schema.js";
import { uploadObject, downloadObject, presignedReadUrl } from "../storage/neon-bucket.js";
import { analyzePaymentScreenshot } from "../ai/nvidia.js";
import { notify, notifyAdmins } from "./notifications.js";
import { logAudit, logAdminAction } from "../lib/audit.js";
import { ApiError } from "../lib/errors.js";
import { sha256Hex } from "../lib/crypto.js";
import type { PaymentDetail, ScreenshotMeta, AIVerificationResult } from "@shared/types.js";

export async function paymentDetailsForOrder(orderId: number): Promise<PaymentDetail[]> {
  const rows = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt));
  return Promise.all(rows.map((p) => serializePaymentDetail(p)));
}

export interface ScreenshotUpload {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** base64-encoded file contents */
  base64: string;
}

export function allowedImageMimeTypes() {
  return ["image/png", "image/jpeg", "image/jpg", "image/webp"];
}

function extensionFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** Upload the raw screenshot to Neon Bucket and record its reference. */
export async function storeScreenshot(input: ScreenshotUpload & { userId: string; orderId: number }) {
  const key = await uploadScreenshotKey(input.userId, input.orderId, input.mimeType, input.base64);
  return key;
}

async function uploadScreenshotKey(userId: string, orderId: number, mimeType: string, base64: string) {
  const bytes = Buffer.from(base64, "base64");
  const bucketPrefix = `screenshots/${userId}/order-${orderId}`;
  const key = `${bucketPrefix}/${crypto.randomUUID()}.${extensionFromMime(mimeType)}`;
  await uploadObject(key, bytes, mimeType);
  return key;
}

export async function createPaymentAttempt(input: {
  userId: string;
  orderId: number;
  methodId: number;
  screenshot: ScreenshotUpload;
  ip?: string;
}) {
  const order = await db.query.orders.findFirst({
    where: (t, { eq: e, and: a }) => a(e(t.id, input.orderId), e(t.userId, input.userId)),
  });
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");

  const allowed = ["PENDING_PAYMENT", "PAYMENT_SUBMITTED", "AI_REVIEWED", "UNDER_ADMIN_REVIEW"];
  if (!allowed.includes(order.status)) {
    throw new ApiError(400, "ORDER_NOT_OPEN", "This order is no longer open for payment submission.");
  }

  const method = await db.query.paymentMethods.findFirst({
    where: (t, { eq: e, and: a }) => a(e(t.id, input.methodId), e(t.isActive, true)),
  });
  if (!method) throw new ApiError(400, "PAYMENT_METHOD_INVALID", "Selected payment method is not available.");

  /* Supersede any open attempts so the latest submission is the live one. */
  await db
    .update(payments)
    .set({ status: "REQUEST_REUPLOAD", updatedAt: new Date() })
    .where(and(eq(payments.orderId, order.id), inArray(payments.status, ["SUBMITTED", "AI_REVIEWED"])));

  const insertedPayments = await db
    .insert(payments)
    .values({
      orderId: order.id,
      userId: input.userId,
      methodId: method.id,
      methodName: method.name,
      amount: order.amount,
      currency: order.currency,
      status: "SUBMITTED",
      aiStatus: "PENDING",
      submittedAt: new Date(),
    })
    .returning();
  const payment = insertedPayments[0];
  if (!payment) throw new ApiError(500, "PAYMENT_CREATE_FAILED", "Could not create the payment record.");

  const objectKey = await uploadScreenshotKey(input.userId, order.id, input.screenshot.mimeType, input.screenshot.base64);

  const insertedShots = await db
    .insert(paymentScreenshots)
    .values({
      paymentId: payment.id,
      orderId: order.id,
      userId: input.userId,
      bucket: "payment-screenshots",
      objectKey,
      fileName: input.screenshot.fileName,
      mimeType: input.screenshot.mimeType,
      sizeBytes: input.screenshot.sizeBytes,
      sha256: sha256Hex(Buffer.from(input.screenshot.base64, "base64")),
    })
    .returning();
  const screenshot = insertedShots[0];
  if (!screenshot) throw new ApiError(500, "SCREENSHOT_CREATE_FAILED", "Could not record the screenshot.");

  await db
    .update(orders)
    .set({ status: "PAYMENT_SUBMITTED", submittedAt: new Date(), updatedAt: new Date() })
    .where(eq(orders.id, order.id));

  await notify({
    userId: input.userId,
    kind: "PAYMENT",
    title: "Payment submitted",
    body: `Your payment for order ${order.orderNumber} was submitted and is being verified.`,
    link: `/dashboard/orders/${order.id}`,
  });
  await notifyAdmins(
    "New payment submitted",
    `Order ${order.orderNumber} — ${order.productName} (${method.name}). Awaiting verification.`,
    `/admin/payment-review/${payment.id}`,
    "PAYMENT",
    `payment-submitted-${payment.id}`,
  );

  void logAudit({
    actorId: input.userId,
    actorRole: "USER",
    action: "payment.submitted",
    targetType: "payment",
    targetId: String(payment.id),
    ip: input.ip,
    meta: { orderId: order.id, orderNumber: order.orderNumber, method: method.name, screenshotId: screenshot.id },
  });

  // Kick off AI analysis in the background; it never blocks the response.
  void runAiAnalysis(payment.id, order.orderNumber, order.productName, order.amount, order.currency).catch((error) => {
    console.error("[payments] background AI analysis failed", error);
  });

  return { paymentId: payment.id, orderId: order.id, screenshotId: screenshot.id };
}

async function runAiAnalysis(
  paymentId: number,
  orderNumber: string,
  productName: string,
  expectedAmount: number,
  currency: string,
): Promise<void> {
  const payment = await db.query.payments.findFirst({ where: (t, { eq: e }) => e(t.id, paymentId) });
  if (!payment) return;

  const screenshots = await db.query.paymentScreenshots.findMany({
    where: (t, { eq: e }) => e(t.paymentId, paymentId),
  });
  const latest = screenshots[0];
  if (!latest) return;

  try {
    const { bytes, mimeType } = await downloadObject(latest.objectKey);
    const mime = mimeType || latest.mimeType;
    const result: AIVerificationResult = await analyzePaymentScreenshot({
      imageBase64: bytes.toString("base64"),
      mimeType: mime,
      expectedAmount,
      currency,
      orderNumber,
      productName,
    });

    const confidence = result.confidence;
    await db
      .update(payments)
      .set({
        aiStatus: result.status as never,
        aiConfidence: confidence != null ? String(confidence) : null,
        aiResult: result as unknown as Record<string, unknown>,
        aiModel: process.env.NVIDIA_VISION_MODEL ?? null,
        aiAnalyzedAt: new Date(),
        status: "AI_REVIEWED",
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));

    await db
      .update(orders)
      .set({ status: "UNDER_ADMIN_REVIEW", updatedAt: new Date() })
      .where(eq(orders.id, payment.orderId));

    await notify({
      userId: payment.userId,
      kind: "PAYMENT",
      title: "Payment analyzed",
      body: `AI verification completed with status "${result.status}". An administrator will confirm your payment shortly.`,
      link: `/dashboard/orders/${payment.orderId}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI analysis failed";
    await db
      .update(payments)
      .set({ aiError: message, status: "AI_REVIEWED", updatedAt: new Date(), aiStatus: "PENDING" })
      .where(eq(payments.id, payment.id));
    await db
      .update(orders)
      .set({ status: "UNDER_ADMIN_REVIEW", updatedAt: new Date() })
      .where(eq(orders.id, payment.orderId));
    await notifyAdmins(
      "AI analysis unavailable",
      `Order ${orderNumber} could not be AI-analyzed (${message}). Please verify manually.`,
      `/admin/payment-review/${payment.id}`,
      "PAYMENT",
      `ai-failed-${payment.id}`,
    );
  }
}

/* ----------------------------- Serialization ----------------------------- */

export async function serializePaymentDetail(payment: typeof payments.$inferSelect): Promise<PaymentDetail> {
  const shots = await db.query.paymentScreenshots.findMany({
    where: (t, { eq: e }) => e(t.paymentId, payment.id),
  });
  const screenshots: ScreenshotMeta[] = await Promise.all(
    shots.map(async (s) => ({
      id: s.id,
      objectKey: s.objectKey,
      fileName: s.fileName,
      mimeType: s.mimeType,
      sizeBytes: s.sizeBytes,
      viewedUrl: await presignedReadUrl(s.objectKey),
    })),
  );

  return {
    id: payment.id,
    orderId: payment.orderId,
    methodName: payment.methodName,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    aiStatus: payment.aiStatus,
    aiConfidence: payment.aiConfidence != null ? Number(payment.aiConfidence) : null,
    aiResult: (payment.aiResult as unknown as AIVerificationResult) ?? null,
    aiModel: payment.aiModel,
    aiAnalyzedAt: payment.aiAnalyzedAt ? payment.aiAnalyzedAt.toISOString() : null,
    aiError: payment.aiError,
    adminDecision: payment.adminDecision,
    adminNote: payment.adminNote,
    submittedAt: payment.submittedAt ? payment.submittedAt.toISOString() : null,
    reviewedAt: payment.reviewedAt ? payment.reviewedAt.toISOString() : null,
    createdAt: payment.createdAt.toISOString(),
    screenshots,
  };
}

/** Review queue for admins with screenshot + AI data ready to display. */
export async function listPaymentsForReview(opts: { status?: string; limit: number; offset: number }) {
  const conditions = [];
  if (opts.status) conditions.push(eq(payments.status, opts.status as never));
  const items = await db
    .select()
    .from(payments)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(payments.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);

  const result = [];
  for (const payment of items) {
    const [detail, order] = await Promise.all([
      serializePaymentDetail(payment),
      db.query.orders.findFirst({ where: (t, { eq: e }) => e(t.id, payment.orderId) }),
    ]);
    result.push({ payment: detail, order });
  }
  return result;
}

export async function paymentForAdmin(paymentId: number) {
  const payment = await db.query.payments.findFirst({ where: (t, { eq: e }) => e(t.id, paymentId) });
  if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");
  const [detail, order, user] = await Promise.all([
    serializePaymentDetail(payment),
    db.query.orders.findFirst({ where: (t, { eq: e }) => e(t.id, payment.orderId) }),
    db.query.users.findFirst({ where: (t, { eq: e }) => e(t.id, payment.userId) }),
  ]);
  return { payment: detail, order, user };
}

/* --------------------------- Admin decisions --------------------------- */

export async function decidePayment(input: {
  adminId: string;
  paymentId: number;
  decision: "APPROVE" | "REJECT" | "REQUEST_REUPLOAD";
  note?: string;
  ip?: string;
}) {
  const payment = await db.query.payments.findFirst({ where: (t, { eq: e }) => e(t.id, input.paymentId) });
  if (!payment) throw new ApiError(404, "PAYMENT_NOT_FOUND", "Payment not found.");

  const order = await db.query.orders.findFirst({ where: (t, { eq: e }) => e(t.id, payment.orderId) });
  if (!order) throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found.");

  const base = {
    adminId: input.adminId,
    reviewedAt: new Date(),
    adminNote: input.note ?? null,
    updatedAt: new Date(),
  };

  if (input.decision === "APPROVE") {
    await db.update(payments).set({ ...base, status: "APPROVED", adminDecision: "APPROVED" }).where(eq(payments.id, payment.id));
    await db.update(orders).set({ status: "APPROVED", approvedAt: new Date(), adminId: input.adminId, adminNote: input.note ?? null, updatedAt: new Date() }).where(eq(orders.id, order.id));
    await notify({
      userId: order.userId,
      kind: "PAYMENT",
      title: "Payment approved",
      body: `Payment for order ${order.orderNumber} was approved. Your order will be fulfilled shortly.`,
      link: `/dashboard/orders/${order.id}`,
    });
    void logAdminAction({
      adminId: input.adminId,
      action: "payment.approved",
      orderId: order.id,
      paymentId: payment.id,
      notes: input.note,
    });
    void logAudit({
      actorId: input.adminId,
      actorRole: "ADMIN",
      action: "payment.approved",
      targetType: "payment",
      targetId: String(payment.id),
      ip: input.ip,
      meta: { orderNumber: order.orderNumber, note: input.note },
    });
  } else if (input.decision === "REJECT") {
    await db.update(payments).set({ ...base, status: "REJECTED", adminDecision: "REJECTED" }).where(eq(payments.id, payment.id));
    await db.update(orders).set({ status: "REJECTED", adminId: input.adminId, adminNote: input.note ?? null, updatedAt: new Date() }).where(eq(orders.id, order.id));
    await notify({
      userId: order.userId,
      kind: "PAYMENT",
      title: "Payment rejected",
      body: `Payment for order ${order.orderNumber} was rejected. ${input.note ? `Reason: ${input.note}` : ""}`,
      link: `/dashboard/orders/${order.id}`,
    });
    void logAdminAction({ adminId: input.adminId, action: "payment.rejected", orderId: order.id, paymentId: payment.id, notes: input.note });
    void logAudit({
      actorId: input.adminId,
      actorRole: "ADMIN",
      action: "payment.rejected",
      targetType: "payment",
      targetId: String(payment.id),
      ip: input.ip,
      meta: { orderNumber: order.orderNumber, note: input.note },
    });
  } else {
    await db.update(payments).set({ ...base, status: "REQUEST_REUPLOAD", adminDecision: "REQUEST_REUPLOAD" }).where(eq(payments.id, payment.id));
    await db.update(orders).set({ status: "PAYMENT_SUBMITTED", adminId: input.adminId, adminNote: input.note ?? null, updatedAt: new Date() }).where(eq(orders.id, order.id));
    await notify({
      userId: order.userId,
      kind: "PAYMENT",
      title: "Re-upload requested",
      body: `We couldn't confirm your payment for order ${order.orderNumber}. ${input.note ? `Please ${input.note}.` : "Please upload a clearer screenshot."}`,
      link: `/dashboard/orders/${order.id}`,
    });
    void logAdminAction({ adminId: input.adminId, action: "payment.reupload-requested", orderId: order.id, paymentId: payment.id, notes: input.note });
    void logAudit({
      actorId: input.adminId,
      actorRole: "ADMIN",
      action: "payment.reupload-requested",
      targetType: "payment",
      targetId: String(payment.id),
      ip: input.ip,
      meta: { orderNumber: order.orderNumber, note: input.note },
    });
  }

  return { order, payment };
}