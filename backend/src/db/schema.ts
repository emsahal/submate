import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* ------------------------------------------------------------------ */
/* Enums                                                               */
/* ------------------------------------------------------------------ */

export const userRoleEnum = pgEnum("user_role", ["USER", "ADMIN"]);
export const productStatusEnum = pgEnum("product_status", ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"]);
export const orderStatusEnum = pgEnum("order_status", [
  "PENDING_PAYMENT",
  "PAYMENT_SUBMITTED",
  "AI_REVIEWED",
  "UNDER_ADMIN_REVIEW",
  "APPROVED",
  "FULFILLED",
  "REJECTED",
  "CANCELLED",
  "EXPIRED",
  "REFUNDED",
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING",
  "SUBMITTED",
  "AI_REVIEWED",
  "APPROVED",
  "REJECTED",
  "REQUEST_REUPLOAD",
  "REFUNDED",
]);
export const aiVerdictEnum = pgEnum("ai_verdict", [
  "PENDING",
  "LIKELY_VALID",
  "LIKELY_INVALID",
  "NEEDS_REVIEW",
  "UNREADABLE",
]);
export const paymentMethodTypeEnum = pgEnum("payment_method_type", [
  "EASYPAISA",
  "JAZZCASH",
  "BANK_TRANSFER",
  "NAYAPAY",
  "OTHER",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "ACTIVE",
  "EXPIRING_SOON",
  "EXPIRED",
  "SUSPENDED",
  "RENEWAL_PENDING",
  "CANCELLED",
]);
export const subscriptionRenewalEnum = pgEnum("subscription_renewal", [
  "NONE",
  "RENEWABLE",
  "RENEWAL_PENDING",
  "RENEWED",
  "NOT_RENEWABLE",
]);
export const slotStatusEnum = pgEnum("slot_status", [
  "AVAILABLE",
  "RESERVED",
  "ALLOCATED",
  "RETIRED",
]);
export const credentialTypeEnum = pgEnum("credential_type", [
  "PROVIDER_LINK",
  "LICENSE_KEY",
  "REDEEM_CODE",
  "ACCESS_URL",
  "BULK_ACCESS",
  "GENERIC",
]);
export const notificationKindEnum = pgEnum("notification_kind", [
  "ORDER",
  "PAYMENT",
  "SUBSCRIPTION",
  "SYSTEM",
  "ADMIN",
]);
export const reviewStatusEnum = pgEnum("review_status", ["PENDING", "PUBLISHED", "HIDDEN"]);
export const blogStatusEnum = pgEnum("blog_status", ["DRAFT", "PUBLISHED", "ARCHIVED"]);
export const notificationChannelEnum = pgEnum("notification_channel", [
  "IN_APP",
  "EMAIL",
  "WHATSAPP",
]);

/* ------------------------------------------------------------------ */
/* Core auth tables (Better Auth compatible)                           */
/* ------------------------------------------------------------------ */

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: userRoleEnum("role").notNull().default("USER"),
    isSuspended: boolean("is_suspended").notNull().default(false),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_email_idx").on(t.email)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  () => [],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const verifications = pgTable(
  "verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verifications_identifier_idx").on(t.identifier)],
);

/* ------------------------------------------------------------------ */
/* Marketplace: categories, products, plans                            */
/* ------------------------------------------------------------------ */

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    image: text("image"),
    icon: text("icon"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("categories_slug_idx").on(t.slug), index("categories_active_idx").on(t.isActive)],
);

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description").notNull().default(""),
    shortDescription: text("short_description").notNull().default(""),
    categoryId: integer("category_id").references(() => categories.id, { onDelete: "set null" }),
    imageUrl: text("image_url"),
    logoUrl: text("logo_url"),
    logoUrlDark: text("logo_url_dark"),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    providerName: text("provider_name"),
    isVerified: boolean("is_verified").notNull().default(false),
    eligibilityNote: text("eligibility_note"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    status: productStatusEnum("status").notNull().default("DRAFT"),
    isFeatured: boolean("is_featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("products_slug_idx").on(t.slug),
    index("products_category_idx").on(t.categoryId),
    index("products_status_idx").on(t.status),
    index("products_featured_idx").on(t.isFeatured),
  ],
);

export const plans = pgTable(
  "plans",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    durationDays: integer("duration_days").notNull().default(30),
    priceLocal: integer("price_local").notNull(),
    priceUsd: integer("price_usd").notNull().default(0),
    currency: text("currency").notNull().default("PKR"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("plans_product_idx").on(t.productId),
    index("plans_active_idx").on(t.isActive),
    check("plans_price_check", sql`${t.priceLocal} >= 0`),
    check("plans_duration_check", sql`${t.durationDays} > 0`),
  ],
);

/* ------------------------------------------------------------------ */
/* Orders & payments                                                   */
/* ------------------------------------------------------------------ */

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    orderNumber: text("order_number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    planId: integer("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    productName: text("product_name").notNull(),
    planName: text("plan_name").notNull(),
    planDurationDays: integer("plan_duration_days").notNull(),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("PKR"),
    screens: integer("screens").notNull().default(1),
    paymentMethodId: integer("payment_method_id").references(() => paymentMethods.id, {
      onDelete: "set null",
    }),
    status: orderStatusEnum("status").notNull().default("PENDING_PAYMENT"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    fulfilledAt: timestamp("fulfilled_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    adminNote: text("admin_note"),
    adminId: text("admin_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("orders_user_idx").on(t.userId),
    index("orders_product_idx").on(t.productId),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_user_status_idx").on(t.userId, t.status),
  ],
);

export const paymentMethods = pgTable(
  "payment_methods",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    type: paymentMethodTypeEnum("type").notNull().default("OTHER"),
    accountDetails: jsonb("account_details").$type<Record<string, string>>().notNull().default({}),
    instructions: text("instructions"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payment_methods_active_idx").on(t.isActive)],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    methodId: integer("method_id").references(() => paymentMethods.id, { onDelete: "set null" }),
    methodName: text("method_name"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("PKR"),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    /* AI verification */
    aiStatus: aiVerdictEnum("ai_status").notNull().default("PENDING"),
    aiConfidence: numeric("ai_confidence", { precision: 3, scale: 2 }),
    aiResult: jsonb("ai_result").$type<Record<string, unknown>>(),
    aiModel: text("ai_model"),
    aiAnalyzedAt: timestamp("ai_analyzed_at", { withTimezone: true }),
    aiError: text("ai_error"),
    /* Admin decision */
    adminDecision: text("admin_decision"),
    adminNote: text("admin_note"),
    adminId: text("admin_id").references(() => users.id, { onDelete: "set null" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    index("payments_user_idx").on(t.userId),
    index("payments_status_idx").on(t.status),
    index("payments_ai_status_idx").on(t.aiStatus),
    index("payments_review_needed_idx").on(t.status, t.aiStatus),
  ],
);

export const paymentScreenshots = pgTable(
  "payment_screenshots",
  {
    id: serial("id").primaryKey(),
    paymentId: integer("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull().unique(),
    fileName: text("file_name"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256"),
    isActive: boolean("is_active").notNull().default(true),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("screenshots_payment_idx").on(t.paymentId),
    index("screenshots_user_idx").on(t.userId),
    uniqueIndex("screenshots_key_idx").on(t.objectKey),
  ],
);

/* ------------------------------------------------------------------ */
/* Subscriptions & delivery                                            */
/* ------------------------------------------------------------------ */

export const accountInventory = pgTable(
  "account_inventory",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    encryptedPassword: text("encrypted_password").notNull(),
    encryptionIv: text("encryption_iv").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    maxSlots: integer("max_slots").notNull().default(5),
    usedSlots: integer("used_slots").notNull().default(0),
    status: text("status").notNull().default("ACTIVE"), // ACTIVE, INACTIVE, FULL
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("inventory_product_idx").on(t.productId),
    index("inventory_status_idx").on(t.status),
  ],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    subscriptionNumber: text("subscription_number").notNull().unique(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    planId: integer("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "restrict" }),
    orderId: integer("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    inventoryAccountId: integer("inventory_account_id").references(() => accountInventory.id, { onDelete: "set null" }),
    allocatedProfileName: text("allocated_profile_name"),
    startDate: date("start_date").notNull(),
    expiryDate: date("expiry_date").notNull(),
    status: subscriptionStatusEnum("status").notNull().default("ACTIVE"),
    renewalStatus: subscriptionRenewalEnum("renewal_status").notNull().default("NONE"),
    notes: text("notes"),
    userConfirmedAt: timestamp("user_confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("subs_user_idx").on(t.userId),
    index("subs_product_idx").on(t.productId),
    index("subs_status_idx").on(t.status),
    index("subs_expiry_idx").on(t.expiryDate),
    index("subs_user_status_idx").on(t.userId, t.status),
    check("subs_dates_check", sql`${t.expiryDate} > ${t.startDate}`),
  ],
);

export const subscriptionSlots = pgTable(
  "subscription_slots",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    planId: integer("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    providerSlotIdentifier: text("provider_slot_identifier"),
    label: text("label"),
    status: slotStatusEnum("status").notNull().default("AVAILABLE"),
    allocatedSubscriptionId: integer("allocated_subscription_id").references(
      () => subscriptions.id,
      { onDelete: "set null" },
    ),
    expiresAt: date("expires_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("slots_product_plan_idx").on(t.productId, t.planId),
    index("slots_status_idx").on(t.status),
  ],
);

export const accessCredentials = pgTable(
  "access_credentials",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id")
      .notNull()
      .unique()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    type: credentialTypeEnum("type").notNull().default("GENERIC"),
    encryptedPayload: text("encrypted_payload").notNull(),
    encryptionIv: text("encryption_iv").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    publicMeta: jsonb("public_meta").$type<Record<string, string>>().notNull().default({}),
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    lastAccessById: text("last_access_by_id").references(() => users.id, { onDelete: "set null" }),
    lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("credentials_subscription_idx").on(t.subscriptionId)],
);

export const otpRequests = pgTable(
  "otp_requests",
  {
    id: serial("id").primaryKey(),
    subscriptionId: integer("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gmailMessageId: text("gmail_message_id").notNull(),
    code: text("code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    requestNumber: integer("request_number").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("otp_subs_idx").on(t.subscriptionId, t.createdAt),
    uniqueIndex("otp_gmail_msg_idx").on(t.gmailMessageId),
  ],
);

/* ------------------------------------------------------------------ */
/* Engagement: reviews, notifications, faqs, blog, settings            */
/* ------------------------------------------------------------------ */

export const reviews = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    status: reviewStatusEnum("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reviews_product_idx").on(t.productId),
    index("reviews_user_idx").on(t.userId),
    index("reviews_status_idx").on(t.status),
    uniqueIndex("reviews_user_product_unique").on(t.userId, t.productId),
    check("reviews_rating_check", sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull().default("SYSTEM"),
    channel: notificationChannelEnum("channel").notNull().default("IN_APP"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    dedupKey: text("dedup_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_user_idx").on(t.userId),
    index("notifications_user_read_idx").on(t.userId, t.readAt),
    uniqueIndex("notifications_dedup_idx").on(t.dedupKey, t.userId),
  ],
);

export const faqItems = pgTable(
  "faq_items",
  {
    id: serial("id").primaryKey(),
    question: text("question").notNull(),
    answer: text("answer").notNull(),
    category: text("category"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("faq_active_idx").on(t.isActive)],
);

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    excerpt: text("excerpt").notNull().default(""),
    content: text("content").notNull().default(""),
    coverImage: text("cover_image"),
    category: text("category"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    status: blogStatusEnum("status").notNull().default("DRAFT"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("blog_slug_idx").on(t.slug),
    index("blog_status_idx").on(t.status),
    index("blog_published_idx").on(t.publishedAt),
    index("blog_category_idx").on(t.category),
  ],
);

export const settings = pgTable(
  "settings",
  {
    key: text("key").primaryKey(),
    value: jsonb("value").$type<Record<string, unknown>>().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  },
  () => [],
);

/* ------------------------------------------------------------------ */
/* Governance: admin actions + audit log                               */
/* ------------------------------------------------------------------ */

export const adminActions = pgTable(
  "admin_actions",
  {
    id: serial("id").primaryKey(),
    adminId: text("admin_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action").notNull(),
    detail: text("detail"),
    orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
    paymentId: integer("payment_id").references(() => payments.id, { onDelete: "set null" }),
    subscriptionId: integer("subscription_id").references(() => subscriptions.id, {
      onDelete: "set null",
    }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("admin_actions_admin_idx").on(t.adminId),
    index("admin_actions_order_idx").on(t.orderId),
    index("admin_actions_created_idx").on(t.createdAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    adminId: text("admin_id").references(() => users.id, { onDelete: "set null" }),
    actorRole: text("actor_role").notNull().default("ADMIN"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_admin_idx").on(t.adminId),
    index("audit_logs_created_idx").on(t.createdAt),
    index("audit_logs_target_idx").on(t.targetType, t.targetId),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Plan = typeof plans.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type PaymentScreenshot = typeof paymentScreenshots.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type FaqItem = typeof faqItems.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type AccountInventory = typeof accountInventory.$inferSelect;
export type NewAccountInventory = typeof accountInventory.$inferInsert;