import { config } from "../config.js";
import { encryptPayload, decryptPayload } from "../lib/crypto.js";
import { getSetting, setSetting } from "../lib/settings.js";

const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_URL = "https://gmail.googleapis.com/gmail/v1/users/me";

export interface GmailConnection {
  email: string;
  connectedAt: string;
  refreshToken: string;
  refreshIv: string;
}

const SETTINGS_KEY = "gmailOtp";

/** In-memory cache of the short-lived access token. */
let accessTokenCache: { token: string; expiresAt: number } | null = null;

function credentials() {
  if (!config.googleClientId || !config.googleClientSecret) {
    return null;
  }
  return { clientId: config.googleClientId, clientSecret: config.googleClientSecret };
}

export function gmailRedirectUri(): string {
  return `${config.backendUrl}/oauth/gmail/callback`;
}

export async function getGmailConnection(): Promise<GmailConnection | null> {
  const stored = await getSetting(SETTINGS_KEY as never);
  if (!stored || typeof stored !== "object") return null;
  const s = stored as unknown as Partial<GmailConnection>;
  if (!s.email || !s.refreshToken || !s.refreshIv) return null;
  return s as GmailConnection;
}

export function buildGmailAuthorizeUrl(): string {
  const creds = credentials();
  if (!creds) throw new Error("Google OAuth credentials are not configured.");
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: gmailRedirectUri(),
    response_type: "code",
    scope: `openid email ${GMAIL_SCOPE}`,
    access_type: "offline",
    prompt: "consent",
  });
  return `${GMAIL_AUTH_URL}?${params.toString()}`;
}

async function gmailFetch(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: unknown }> {
  const access = await getAccessToken();
  if (!access) throw new Error("Gmail is not connected.");
  const res = await fetch(`${GMAIL_API_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${access.token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`Gmail API ${res.status}: ${(body as { error?: { message?: string } })?.error?.message ?? res.statusText}`);
  }
  return { ok: true, status: res.status, body };
}

/**
 * Exchange the OAuth authorization code (from the callback) for tokens and
 * store the refresh token encrypted. Returns the connected mailbox email.
 */
export async function storeGmailTokensFromCode(code: string): Promise<{ email: string }> {
  const creds = credentials();
  if (!creds) throw new Error("Google OAuth credentials are not configured.");
  const res = await fetch(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: gmailRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const data = (await res.json().catch(() => null)) as {
    refresh_token?: string;
    access_token?: string;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.refresh_token) {
    throw new Error(data.error_description ?? data.error ?? `Token exchange failed (${res.status}).`);
  }

  const profile = await fetch(`${GMAIL_API_URL}/profile`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const profileBody = (await profile.json().catch(() => null)) as { emailAddress?: string } | null;

  const { ciphertext, iv } = encryptPayload(data.refresh_token);
  const connection: GmailConnection = {
    email: profileBody?.emailAddress ?? "unknown@example.com",
    refreshToken: ciphertext,
    refreshIv: iv,
    connectedAt: new Date().toISOString(),
  };
  await setSetting(SETTINGS_KEY, connection as unknown as Record<string, unknown>);
  accessTokenCache = null;
  return { email: connection.email };
}

export async function disconnectGmail(): Promise<void> {
  await setSetting(SETTINGS_KEY, {});
}

async function getAccessToken(): Promise<{ token: string; email: string } | null> {
  if (accessTokenCache && accessTokenCache.expiresAt > Date.now() + 30_000) {
    const conn = await getGmailConnection();
    if (conn) return { token: accessTokenCache.token, email: conn.email };
  }
  const conn = await getGmailConnection();
  if (!conn) return null;
  const creds = credentials();
  if (!creds) return null;

  const refreshToken = decryptPayload(conn.refreshToken, conn.refreshIv);
  const res = await fetch(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      refresh_token: refreshToken,
    }),
  });
  const data = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) {
    accessTokenCache = null;
    throw new Error(`Failed to refresh Gmail access token: ${data.error ?? res.statusText}`);
  }
  accessTokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return { token: data.access_token, email: conn.email };
}

export interface NetflixOtpMessage {
  messageId: string;
  code: string;
  subject: string;
  from: string;
  sentAt: string | null;
}

function decodeBody(part: Record<string, unknown> | null | undefined): string {
  if (!part) return "";
  // Decode base64url body data if present
  if (typeof (part as { body?: { data?: string } }).body?.data === "string") {
    const raw = (part as { body: { data: string } }).body.data;
    let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    try {
      return Buffer.from(b64, "base64").toString("utf8");
    } catch {
      return "";
    }
  }
  // Legacy: top-level data field
  if (typeof part.data === "string") {
    let b64 = part.data.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    try {
      return Buffer.from(b64, "base64").toString("utf8");
    } catch {
      return "";
    }
  }
  // Recurse into child parts (multipart/*)
  if (Array.isArray(part.parts)) {
    return (part.parts as Record<string, unknown>[]).map(decodeBody).join("\n");
  }
  return "";
}

function extractCode(subject: string, body: string): string | null {
  // Netflix and similar services send 4–8 digit OTP codes.
  // 1. Prefer a code that immediately follows or precedes a keyword
  const keywordPatterns = [
    /(?:code|verify|verification|sign.?in|enter)[^\d]{0,30}(\d{4,8})\b/i,
    /\b(\d{4,8})\b[^\d]{0,30}(?:code|verify|verification|sign.?in)/i,
  ];
  for (const text of [subject, body]) {
    for (const re of keywordPatterns) {
      const m = text.match(re);
      if (m?.[1]) return m[1];
    }
  }
  // 2. Fall back to any standalone 4–8 digit sequence
  for (const text of [subject, body]) {
    const m = text.match(/\b(\d{4,8})\b/);
    if (m) return m[1] ?? null;
  }
  return null;
}

/**
 * Find the most recent Netflix verification email and parse the 6-digit code.
 * The code commonly appears in the subject line, with a body fallback.
 */
export async function fetchLatestNetflixOtpCode(): Promise<NetflixOtpMessage | null> {
  // Broad query: any Netflix-related sender domain or common OTP subject keywords,
  // extended to 3-day window to tolerate slight delays.
  const query = 'newer_than:3d (from:@netflix.com OR subject:"verification code" OR subject:"sign-in code" OR subject:"your code")';
  const list = await gmailFetch(
    `/messages?q=${encodeURIComponent(query)}&maxResults=20`,
  );
  const messages = (list.body as { messages?: { id: string }[] }).messages ?? [];
  if (!messages.length) return null;

  for (const msg of messages) {
    const detail = await gmailFetch(`/messages/${msg.id}?format=full`);
    const d = detail.body as {
      id: string;
      internalDate?: string;
      payload?: {
        headers?: { name?: string; value?: string }[];
        mimeType?: string;
        parts?: Record<string, unknown>[];
      };
    };
    const headers = new Map((d.payload?.headers ?? []).map((h) => [String(h.name).toLowerCase(), h.value ?? ""]));
    const subject = headers.get("subject") ?? "";
    const from = headers.get("from") ?? "";
    const sentAt = d.internalDate ? new Date(Number(d.internalDate)).toISOString() : null;
    const body = decodeBody(d.payload as Record<string, unknown> | undefined);
    const code = extractCode(subject, body);
    if (code) {
      return { messageId: d.id, code, subject, from, sentAt };
    }
  }
  return null;
}
