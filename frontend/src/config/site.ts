export const siteConfig = {
  name: "SubMate",
  legalName: "SubMate Marketplace",
  tagline: "Digital subscriptions, simplified for Pakistan",
  description:
    "SubMate is Pakistan's trusted digital subscription marketplace. Buy Netflix, Spotify, Canva Pro, ChatGPT and more — pay with JazzCash, Easypaisa or bank transfer in PKR. Every payment is human-verified before access is delivered to your dashboard.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "en_PK",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "support@submate.tech",
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP ?? "923149466389",
  whatsappDisplay: "+92 314 9466389",
  currency: "PKR",
  defaultPagination: 12,
};

export const typeformIds = {};

export const navLinks = [
  { href: "/subscriptions", label: "Subscriptions" },
  { href: "/categories", label: "Categories" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

export const footerLinks = {
  marketplace: [
    { href: "/subscriptions", label: "Browse Subscriptions" },
    { href: "/categories", label: "Categories" },
    { href: "/faq", label: "FAQ" },
    { href: "/about", label: "About Us" },
  ],
  company: [
    { href: "/about", label: "About Us" },
    { href: "/contact", label: "Contact" },
    { href: "/blog", label: "Blog" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
    { href: "/refund-policy", label: "Refund Policy" },
  ],
};

export const orderStatusConfig: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  PENDING_PAYMENT: { label: "Pending Payment", tone: "warning" },
  PAYMENT_SUBMITTED: { label: "Payment Submitted", tone: "info" },
  AI_REVIEWED: { label: "AI Reviewed", tone: "info" },
  UNDER_ADMIN_REVIEW: { label: "Under Review", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  FULFILLED: { label: "Fulfilled", tone: "success" },
  REJECTED: { label: "Rejected", tone: "destructive" },
  CANCELLED: { label: "Cancelled", tone: "secondary" },
  EXPIRED: { label: "Expired", tone: "secondary" },
  REFUNDED: { label: "Refunded", tone: "secondary" },
};

export const paymentStatusConfig: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  PENDING: { label: "Pending", tone: "warning" },
  SUBMITTED: { label: "Submitted", tone: "info" },
  AI_REVIEWED: { label: "AI Reviewed", tone: "info" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "destructive" },
  REQUEST_REUPLOAD: { label: "Re-upload Requested", tone: "warning" },
  REFUNDED: { label: "Refunded", tone: "secondary" },
};

export const aiVerdictConfig: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  PENDING: { label: "Pending", tone: "default" },
  LIKELY_VALID: { label: "Likely Valid", tone: "success" },
  LIKELY_INVALID: { label: "Likely Invalid", tone: "destructive" },
  NEEDS_REVIEW: { label: "Needs Review", tone: "warning" },
  UNREADABLE: { label: "Unreadable", tone: "secondary" },
};

export const subscriptionStatusConfig: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  ACTIVE: { label: "Active", tone: "success" },
  EXPIRING_SOON: { label: "Expiring Soon", tone: "warning" },
  EXPIRED: { label: "Expired", tone: "secondary" },
  SUSPENDED: { label: "Suspended", tone: "destructive" },
  RENEWAL_PENDING: { label: "Renewal Pending", tone: "info" },
  CANCELLED: { label: "Cancelled", tone: "secondary" },
};

export const reviewStatusConfig: Record<string, { label: string; tone: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" }> = {
  PENDING: { label: "Pending Moderation", tone: "warning" },
  PUBLISHED: { label: "Published", tone: "success" },
  HIDDEN: { label: "Hidden", tone: "secondary" },
};

/** Approved payment step names for the customer order flow. */
export const orderFlowSteps = [
  { key: "created", label: "Order Created" },
  { key: "payment", label: "Payment Instructions" },
  { key: "submitted", label: "Payment Submitted" },
  { key: "review", label: "Verification" },
  { key: "fulfilled", label: "Fulfilled" },
];

export const notificationKinds = [
  "ORDER",
  "PAYMENT",
  "SUBSCRIPTION",
  "SYSTEM",
  "ADMIN",
] as const;
