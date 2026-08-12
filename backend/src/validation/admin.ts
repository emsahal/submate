import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().max(20_000).default(""),
  shortDescription: z.string().trim().max(400).default(""),
  categoryId: z.number().int().positive().nullable(),
  imageUrl: optionalText(500),
  logoUrl: optionalText(500),
  logoUrlDark: optionalText(500),
  features: z.array(z.string().trim().max(200)).max(20).default([]),
  providerName: optionalText(120),
  isVerified: z.boolean().default(false),
  eligibilityNote: optionalText(2000),
  seoTitle: optionalText(200),
  seoDescription: optionalText(300),
  status: z.enum(["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]).default("DRAFT"),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(-1000).max(1000).default(0),
});

export const planSchema = z.object({
  productId: z.number().int().positive(),
  name: z.string().trim().min(1).max(80),
  durationDays: z.number().int().positive().max(3650),
  priceLocal: z.number().int().min(0).max(100_000_000),
  priceUsd: z.number().int().min(0).max(100_000).default(0),
  currency: z.string().trim().min(2).max(6).default("PKR"),
  description: optionalText(500),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: optionalText(2000),
  image: optionalText(500),
  icon: optionalText(100),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  seoTitle: optionalText(200),
  seoDescription: optionalText(300),
});

export const paymentMethodSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(["EASYPAISA", "JAZZCASH", "BANK_TRANSFER", "NAYAPAY", "OTHER"]).default("OTHER"),
  accountDetails: z.record(z.string(), z.string()).default({}),
  instructions: optionalText(3000),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const userStatusSchema = z.object({
  role: z.enum(["USER", "ADMIN"]).default("USER"),
  isSuspended: z.boolean().default(false),
});

export const blogSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().max(500).default(""),
  content: z.string().trim().max(100_000).default(""),
  coverImage: optionalText(500),
  category: optionalText(80),
  tags: z.array(z.string().trim().max(50)).max(10).default([]),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
  seoTitle: optionalText(200),
  seoDescription: optionalText(300),
});

export const faqSchema = z.object({
  question: z.string().trim().min(3).max(500),
  answer: z.string().trim().min(3).max(10_000),
  category: optionalText(80),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const settingsSchema = z.object({
  storeName: z.string().trim().min(2).max(80).optional(),
  supportEmail: z.string().trim().email().max(120).or(z.literal("")).optional(),
  currency: z.string().trim().min(2).max(6).optional(),
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().trim().max(2000).optional(),
  seo: z
    .object({
      defaultTitle: z.string().trim().max(200).optional(),
      defaultDescription: z.string().trim().max(400).optional(),
    })
    .optional(),
  order: z
    .object({
      pendingExpiryHours: z.number().int().min(1).max(720).optional(),
      screenshotMaxBytes: z.number().int().min(1024).max(50_000_000).optional(),
      allowedMimeTypes: z.array(z.string()).max(10).optional(),
    })
    .optional(),
});

export const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});