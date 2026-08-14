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

function renderHtml(opts: { storeName: string; title: string; body: string; link?: string; linkLabel?: string }): string {
  const bodyLines = escapeHtml(opts.body)
    .split("\n")
    .map((l) => (l.trim() === "" ? "<br/>" : `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#333333;">${l}</p>`))
    .join("");

  const button = opts.link
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 0;">
        <tr>
          <td style="border-radius:6px;background-color:#0f6e58;">
            <a href="${escapeHtml(opts.link)}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;background-color:#0f6e58;">
              ${escapeHtml(opts.linkLabel ?? "View details")}
            </a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">

  <!-- Main container -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;padding:40px 20px;">
    <tr>
      <td align="left">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
          
          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #eaeaea;">
              <a href="https://submate.tech" style="text-decoration:none;display:inline-block;font-size:22px;font-weight:800;color:#0f6e58;font-family:-apple-system,BlinkMacSystemFont,sans-serif;letter-spacing:-0.03em;">
                <span style="color:#111111;">Sub</span>Mate<span style="color:#0f6e58;">.</span>
              </a>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px 0 32px;">
              <h2 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#111111;line-height:1.4;letter-spacing:-0.01em;">
                ${escapeHtml(opts.title)}
              </h2>
              <div style="font-size:15px;line-height:1.7;color:#333333;">
                ${bodyLines}
              </div>
              ${button}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;border-top:1px solid #eaeaea;font-size:12px;line-height:1.6;color:#666666;">
              <p style="margin:0 0 8px;">
                This email was sent by <strong>${escapeHtml(opts.storeName)}</strong>, Pakistan's trusted digital subscription marketplace.
              </p>
              <p style="margin:0 0 16px;">
                Have questions or need support? Reply directly to this email or contact us at 
                <a href="mailto:support@submate.tech" style="color:#0f6e58;text-decoration:none;font-weight:500;">support@submate.tech</a>.
              </p>
              <p style="margin:0;color:#999999;font-size:11px;">
                &copy; ${new Date().getFullYear()} SubMate. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
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
  let storeName = "SubMate";
  const settings = await getSettings().catch(() => null);
  storeName = settings?.storeName || storeName;
  if (!from) {
    from = "SubMate <noreply@submate.tech>";
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