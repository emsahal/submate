/** Shared API contract types used by both the backend and the frontend. */

export type Role = "USER" | "ADMIN";
export type ProductStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAYMENT_SUBMITTED"
  | "AI_REVIEWED"
  | "UNDER_ADMIN_REVIEW"
  | "APPROVED"
  | "FULFILLED"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED"
  | "REFUNDED";
export type PaymentStatus =
  | "PENDING"
  | "SUBMITTED"
  | "AI_REVIEWED"
  | "APPROVED"
  | "REJECTED"
  | "REQUEST_REUPLOAD"
  | "REFUNDED";
export type AiVerdict = "PENDING" | "LIKELY_VALID" | "LIKELY_INVALID" | "NEEDS_REVIEW" | "UNREADABLE";
export type PaymentMethodType = "EASYPAISA" | "JAZZCASH" | "BANK_TRANSFER" | "NAYAPAY" | "OTHER";
export type SubscriptionStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "SUSPENDED"
  | "RENEWAL_PENDING"
  | "CANCELLED";
export type SubscriptionRenewal = "NONE" | "RENEWABLE" | "RENEWAL_PENDING" | "RENEWED" | "NOT_RENEWABLE";
export type NotificationKind = "ORDER" | "PAYMENT" | "SUBSCRIPTION" | "SYSTEM" | "ADMIN";
export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN";
export type BlogStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/* ----------------------------- Public API ----------------------------- */

export interface PublicCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  productCount: number;
}

export interface PublicPlan {
  id: number;
  name: string;
  durationDays: number;
  priceLocal: number;
  priceUsd: number;
  currency: string;
  description: string | null;
}

export interface PublicProduct {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  categoryId: number | null;
  category?: PublicCategory | null;
  imageUrl: string | null;
  logoUrl: string | null;
  logoUrlDark: string | null;
  features: string[];
  providerName: string | null;
  isVerified: boolean;
  eligibilityNote: string | null;
  isFeatured: boolean;
  plans: PublicPlan[];
  minPrice: number;
  maxPrice: number;
  reviewSummary?: { average: number; count: number };
}

export interface PublicBlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  category: string | null;
  tags: string[];
  publishedAt: string | null;
}

export interface PublicBlogPostDetail extends PublicBlogPost {
  content: string;
  seoTitle: string | null;
  seoDescription: string | null;
}

export interface PublicFaq {
  id: number;
  question: string;
  answer: string;
  category: string | null;
  isFeatured: boolean;
}

export interface PublicReview {
  id: number;
  rating: number;
  comment: string | null;
  userName: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/* ----------------------------- Account ----------------------------- */

export interface PublicPaymentMethod {
  id: number;
  name: string;
  type: PaymentMethodType;
  accountDetails: Record<string, string>;
  instructions: string | null;
  isActive: boolean;
}

export interface MeProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  phone: string | null;
  createdAt: string;
}

export interface NotificationItem {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/* --------------------------- Orders / payments --------------------------- */

export interface ScreenshotMeta {
  id: number;
  objectKey: string;
  fileName: string | null;
  mimeType: string;
  sizeBytes: number;
  viewedUrl: string;
}

export interface PaymentDetail {
  id: number;
  orderId: number;
  methodName: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  aiStatus: AiVerdict;
  aiConfidence: number | null;
  aiResult: AIVerificationResult | null;
  aiModel: string | null;
  aiAnalyzedAt: string | null;
  aiError: string | null;
  adminDecision: string | null;
  adminNote: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  screenshots: ScreenshotMeta[];
}

export interface OrderDetail {
  id: number;
  orderNumber: string;
  productId: number;
  productSlug: string;
  productName: string;
  planId: number;
  planName: string;
  planDurationDays: number;
  amount: number;
  currency: string;
  screens: number;
  status: OrderStatus;
  submittedAt: string | null;
  approvedAt: string | null;
  fulfilledAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  payment?: PaymentDetail | null;
  payments: PaymentDetail[];
  paymentMethods: PublicPaymentMethod[];
  canSubmitPayment: boolean;
}

export interface SubscriptionOtpStatus {
  enabled: boolean;
  used: number;
  limit: number;
  canRequest: boolean;
  activeExpiresAt: string | null;
}

export interface SubscriptionDetail {
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
  renewalStatus: SubscriptionRenewal;
  notes: string | null;
  userConfirmedAt: string | null;
  remainingDays: number;
  isExpiringSoon: boolean;
  isExpired: boolean;
  createdAt: string;
  accessMeta: Record<string, string> | null;
  access: string | null;
  accessType: string | null;
  hasCredential: boolean;
  otp?: SubscriptionOtpStatus | null;
}

export interface CustomerOverview {
  activeSubscriptions: number;
  pendingOrders: number;
  expiringSoon: number;
  completedOrders: number;
  unreadNotifications: number;
}

/* ----------------------------- Structured AI ----------------------------- */

export interface AIVerificationResult {
  status: AiVerdict | string;
  amount: number | null;
  currency: string | null;
  transactionId: string | null;
  paymentDate: string | null;
  receiver: string | null;
  sender: string | null;
  paymentStatus: string | null;
  confidence: number | null;
  issues: string[];
  missing: string[];
  readability: string | null;
  summary: string;
}

/* ------------------------------- Admin ------------------------------- */

export interface AdminDashboardStats {
  totalOrders: number;
  pendingPayments: number;
  underReview: number;
  todayRevenue: number;
  monthRevenue: number;
  activeSubscriptions: number;
  expiringSoon: number;
  expired: number;
  pendingReviews: number;
  totalUsers: number;
  newToday: number;
  recentOrders: AdminOrderRow[];
  recentPayments: PaymentDetail[];
  revenueLast7Days: { day: string; value: number }[];
  topProducts: { slug: string; name: string; orders: number; revenue: number }[];
}

export interface AdminOrderRow {
  id: number;
  orderNumber: string;
  user: { id: string; name: string; email: string };
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
}

export interface AdminPaymentReview {
  id: number;
  orderId: number;
  orderNumber: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  methodName: string | null;
  aiStatus: AiVerdict;
  aiConfidence: number | null;
  aiResult: AIVerificationResult | null;
  submittedAt: string | null;
  user: { id: string; name: string; email: string };
  order: { productName: string; planName: string; planDurationDays: number };
  screenshots: ScreenshotMeta[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}
