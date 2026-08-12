import { Resend } from "resend";
import { config } from "../config.js";
import { getSettings } from "../lib/settings.js";

let client: Resend | null = null;

function resend(): Resend | null {
  if (!config.resendApiKey) return null;
  client ??= new Resend(config.resendApiKey);
  return client;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] as string);
}

function renderHtml(opts: { storeName: string; title: string; body: string; link?: string }): string {
  const button = opts.link
    ? `<a href="${escapeHtml(opts.link)}" style="display:inline-block;background:#7c3aed;color:#ffffff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;">View details</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;padding:0;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#f4f4f5;">
  <div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#0b1220;color:#ffffff;padding:20px 28px;">
      <p style="margin:0;font-size:15px;font-weight:700;">${escapeHtml(opts.storeName)}</p>
    </div>
    <div style="padding:28px;">
      <h1 style="margin:0 0 12px;font-size:20px;color:#18181b;">${escapeHtml(opts.title)}</h1>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#3f3f46;white-space:pre-wrap;">${escapeHtml(opts.body)}</p>
      ${button}
    </div>
    <div style="padding:16px 28px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;">
      <p style="margin:0;">You're receiving this because you have an account with ${escapeHtml(opts.storeName)}.</p>
    </div>
  </div>
</body></html>`;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  title?: string;
  body: string;
  link?: string;
}

/** Send a transactional email via Resend. Never throws — returns false when skipped or on failure. */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const clientInstance = resend();
  if (!clientInstance) return false;

  let from = config.resendFromEmail;
  let storeName = "Subly";
  const settings = await getSettings().catch(() => null);
  storeName = settings?.storeName || storeName;
  if (!from) {
    from = settings?.supportEmail || "Subly <onboarding@resend.dev>";
  }

  try {
    const { error } = await clientInstance.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      replyTo: config.resendReplyTo,
      html: renderHtml({ storeName, title: input.title ?? input.subject, body: input.body, link: input.link }),
    });
    if (error) {
      console.error("[email] Resend send failed", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Resend send threw", err);
    return false;
  }
}