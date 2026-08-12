import { z } from "zod";

export const createOrderSchema = z.object({
  productId: z.number().int().positive(),
  planId: z.number().int().positive(),
  paymentMethodId: z.number().int().positive().optional(),
});

export const cancelOrderSchema = z.object({
  orderId: z.number().int().positive(),
  reason: z.string().max(500).optional(),
});

export const submitPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  paymentMethodId: z.number().int().positive(),
});

export const reviewDecisionSchema = z.object({
  paymentId: z.number().int().positive(),
  decision: z.enum(["APPROVE", "REJECT", "REQUEST_REUPLOAD"]),
  note: z.string().max(2000).optional(),
});

export const fulfillOrderSchema = z.object({
  orderId: z.number().int().positive(),
});

export const subscriptionActionSchema = z.object({
  subscriptionId: z.number().int().positive(),
  action: z.enum(["RENEW", "SUSPEND", "ACTIVATE", "CANCEL"]),
  note: z.string().max(2000).optional(),
});

export const rejectReasonSchema = z
  .union([z.string().min(5).max(2000), z.literal("")])
  .optional();

export const uploadScreenshotSchema = z.object({
  orderId: z.number().int().positive(),
});

export const reviewSchema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});