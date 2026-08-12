import { db } from "../db/index.js";
import { reviews } from "../db/schema.js";
import { ApiError } from "../lib/errors.js";
import { logAudit } from "../lib/audit.js";
import { z } from "zod";

export async function createReview(input: { userId: string; productId: number; rating: number; comment?: string }) {
  const existing = await db.query.reviews.findFirst({
    where: (t, { and: a, eq: e }) => a(e(t.userId, input.userId), e(t.productId, input.productId)),
  });
  if (existing) throw new ApiError(400, "REVIEW_EXISTS", "You have already reviewed this product.");

  const inserted = await db
    .insert(reviews)
    .values({
      productId: input.productId,
      userId: input.userId,
      rating: input.rating,
      comment: input.comment ?? null,
      status: "PENDING",
    })
    .returning();
  const review = inserted[0];
  if (!review) throw new ApiError(500, "REVIEW_CREATE_FAILED", "Could not submit your review.");

  void logAudit({
    actorId: input.userId,
    actorRole: "USER",
    action: "review.created",
    targetType: "review",
    targetId: String(review.id),
    meta: { productId: input.productId, rating: input.rating },
  });

  return review;
}

export { z };