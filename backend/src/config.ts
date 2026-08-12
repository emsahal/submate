function required(name: string, fallback?: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing required environment variable: ${name}. Copy .env.example to .env and configure it.`);
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined;
}

/** Optional comma-separated list → array */
function list(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const config = {
  nodeEnv: (process.env.NODE_ENV ?? "development") as "development" | "production" | "test",
  isProd: process.env.NODE_ENV === "production",

  /** Own URL (backend). Default http://localhost:3001 */
  backendUrl: optional("BACKEND_URL") ?? "http://localhost:3001",
  /** Frontend URL (allowed CORS / trusted origin). */
  frontendUrl: optional("FRONTEND_URL") ?? "http://localhost:3000",

  databaseUrl: required("DATABASE_URL"),
  authSecret: required("AUTH_SECRET"),
  adminEmails: list("ADMIN_EMAILS"),

  googleClientId: required("GOOGLE_CLIENT_ID", ""),
  googleClientSecret: required("GOOGLE_CLIENT_SECRET", ""),

  /** Resend transactional email. When unset, email sending is a no-op. */
  resendApiKey: optional("RESEND_API_KEY"),
  resendFromEmail: optional("RESEND_FROM_EMAIL"),
  resendReplyTo: optional("RESEND_REPLY_TO"),

  nvidiaApiKey: optional("NVIDIA_API_KEY"),
  nvidiaBaseUrl: optional("NVIDIA_BASE_URL") ?? "https://integrate.api.nvidia.com/v1",
  nvidiaVisionModel: optional("NVIDIA_VISION_MODEL") ?? "nvidia/nemotron-nano-12b-v2-vl",
  nvidiaChatModel: optional("NVIDIA_CHAT_MODEL") ?? "meta/llama-3.1-70b-instruct",

  storageBucket: required("NEON_STORAGE_BUCKET", "payment-screenshots"),
  storageRegion: optional("NEON_STORAGE_REGION") ?? "us-east-2",
  storageEndpointUrl: optional("AWS_ENDPOINT_URL_S3"),
  storageAccessKeyId: optional("AWS_ACCESS_KEY_ID"),
  storageSecretAccessKey: optional("AWS_SECRET_ACCESS_KEY"),

  credentialsEncryptionKey: required("CREDENTIALS_ENCRYPTION_KEY"),

  /** Optional header secret protecting the cron endpoint. */
  cronSecret: optional("CRON_SECRET"),
  /**
   * Optional Upstash Redis for distributed rate limiting.
   * When unset, an in-memory limiter is used (single-instance).
   */
  upstashRedisRestUrl: optional("UPSTASH_REDIS_REST_URL"),
  upstashRedisRestToken: optional("UPSTASH_REDIS_REST_TOKEN"),

  /** Development-only feature flags */
  allowEmailDevLogin: optional("ALLOW_EMAIL_DEV_LOGIN") === "true",
};

export type AppConfig = typeof config;