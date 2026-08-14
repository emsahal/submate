import { and, count, desc, eq, gt, gte } from "drizzle-orm";
import { db } from "../db/index.js";
import { otpRequests, subscriptions, accessCredentials } from "../db/schema.js";
import { decryptPayload } from "../lib/crypto.js";
import { ApiError } from "../lib/errors.js";
import { logAudit } from "../lib/audit.js";
import { fetchLatestNetflixOtpCode, getGmailConnection } from "./gmail.js";
import type { SubscriptionOtpStatus } from "@shared/types.js";

export const OTP_LIMIT = 3;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function getOtpStatus(subscriptionId: number): Promise<SubscriptionOtpStatus> {
  const connection = await getGmailConnection();
  const windowStart = new Date(Date.now() - OTP_WINDOW_MS);
  const rows = await db
    .select({ value: count() })
    .from(otpRequests)
    .where(and(eq(otpRequests.subscriptionId, subscriptionId), gte(otpRequests.createdAt, windowStart)));
  const used = rows[0]?.value ?? 0;

  const active = await db
    .select({ expiresAt: otpRequests.expiresAt })
    .from(otpRequests)
    .where(and(eq(otpRequests.subscriptionId, subscriptionId), gt(otpRequests.expiresAt, new Date())))
    .orderBy(desc(otpRequests.expiresAt))
    .limit(1);

  return {
    enabled: Boolean(connection),
    used,
    limit: OTP_LIMIT,
    canRequest: Boolean(connection) && used < OTP_LIMIT,
    activeExpiresAt: active[0] ? active[0].expiresAt.toISOString() : null,
  };
}

export async function requestOtpForSubscription(input: { userId: string; subscriptionId: number }): Promise<{
  code: string;
  expiresAt: string;
  remaining: number;
  used: number;
  limit: number;
}> {
  const sub = await db.query.subscriptions.findFirst({
    where: (t, { eq: e }) => e(t.id, input.subscriptionId),
  });
  if (!sub) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.");
  if (sub.userId !== input.userId) throw new ApiError(404, "SUBSCRIPTION_NOT_FOUND", "Subscription not found.");
  if (sub.status === "SUSPENDED" || sub.status === "CANCELLED") {
    throw new ApiError(403, "SUBSCRIPTION_CLOSED", "This subscription is not active.");
  }
  if (sub.status === "EXPIRED") {
    throw new ApiError(403, "SUBSCRIPTION_EXPIRED", "This subscription has expired.");
  }

  const connection = await getGmailConnection();
  if (!connection) {
    throw new ApiError(503, "GMAIL_NOT_CONNECTED", "Access codes aren't available yet. Please try again later.");
  }

  const windowStart = new Date(Date.now() - OTP_WINDOW_MS);
  const countRows = await db
    .select({ value: count() })
    .from(otpRequests)
    .where(and(eq(otpRequests.subscriptionId, sub.id), gte(otpRequests.createdAt, windowStart)));
  const used = countRows[0]?.value ?? 0;
  if (used >= OTP_LIMIT) {
    throw new ApiError(
      429,
      "OTP_LIMIT_REACHED",
      `You've used all ${OTP_LIMIT} access-code requests for today. Please contact us on WhatsApp for help.`,
    );
  }

  const cred = await db.query.accessCredentials.findFirst({
    where: (t, { eq: e }) => e(t.subscriptionId, sub.id),
  });

  let targetEmail: string | undefined;
  if (cred) {
    if (cred.publicMeta && typeof cred.publicMeta === "object" && "assignedEmail" in cred.publicMeta) {
      targetEmail = (cred.publicMeta as { assignedEmail?: string }).assignedEmail;
    }
    if (!targetEmail) {
      try {
        const decrypted = decryptPayload(cred.encryptedPayload, cred.encryptionIv, cred.keyVersion);
        if (decrypted.includes("{") && decrypted.includes("}")) {
          const parsed = JSON.parse(decrypted) as Record<string, string>;
          targetEmail = parsed.email || parsed.username || parsed.login;
        } else if (decrypted.includes(":")) {
          targetEmail = decrypted.split(":")[0];
        } else {
          targetEmail = decrypted;
        }
        if (targetEmail) {
          // Extract exact email if there are trailing details
          const emailMatch = targetEmail.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
          if (emailMatch) {
            targetEmail = emailMatch[0];
          } else {
            targetEmail = targetEmail.trim();
          }
        }
      } catch (err) {
        console.error("Failed to decrypt access credentials for OTP filtering:", err);
      }
    }
  }

  const otp = await fetchLatestNetflixOtpCode(targetEmail);
  if (!otp) {
    throw new ApiError(
      404,
      "NO_OTP_FOUND",
      "No access code found yet. Open the official service website or app and request a verification code first, then try again here.",
    );
  }

  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  let inserted: (typeof otpRequests.$inferSelect)[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      inserted = await db
        .insert(otpRequests)
        .values({
          subscriptionId: sub.id,
          userId: input.userId,
          gmailMessageId: otp.messageId,
          code: otp.code,
          expiresAt,
          requestNumber: used + 1,
        })
        .returning();
      break;
    } catch (err) {
      if (attempt === 0 && err && typeof err === "object" && "code" in err && (err as { code: string }).code === "23505") {
        const newer = await fetchLatestNetflixOtpCode(targetEmail);
        if (newer && newer.messageId !== otp.messageId) {
          otp.code = newer.code;
          otp.messageId = newer.messageId;
          continue;
        }
      }
      throw err;
    }
  }

  if (!inserted[0]) {
    throw new ApiError(500, "OTP_CREATE_FAILED", "Could not save the access code. Please try again.");
  }

  void logAudit({
    actorId: input.userId,
    actorRole: "USER",
    action: "otp.requested",
    targetType: "subscription",
    targetId: String(sub.id),
    meta: { subscriptionNumber: sub.subscriptionNumber, requestNumber: used + 1 },
  });

  return {
    code: otp.code,
    expiresAt: expiresAt.toISOString(),
    remaining: OTP_LIMIT - used - 1,
    used: used + 1,
    limit: OTP_LIMIT,
  };
}
