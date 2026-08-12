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
    .map((l) => (l.trim() === "" ? "<br/>" : `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3d4a45;">${l}</p>`))
    .join("");

  const button = opts.link
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
        <tr>
          <td style="border-radius:10px;background:linear-gradient(135deg,#0f6e58 0%,#14b8a6 60%,#22d3ee 130%);">
            <a href="${escapeHtml(opts.link)}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;letter-spacing:-0.01em;border-radius:10px;">
              ${escapeHtml(opts.linkLabel ?? "View details")} &rarr;
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
<body style="margin:0;padding:0;background:#f0ede6;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0ede6;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2ddd5;box-shadow:0 4px 32px rgba(13,19,17,0.08);">

          <!-- Header with logo -->
          <tr>
            <td style="background:#faf8f4;padding:28px 36px;border-bottom:1px solid #e2ddd5;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- SubMate logo: "Sub" dark + "Mate" green gradient + green dot -->
                    <span style="font-size:26px;font-weight:900;letter-spacing:-0.04em;line-height:1;">
                      <span style="color:#0d1311;">Sub</span><!--
                   --><span style="background:linear-gradient(90deg,#0f6e58 0%,#14b8a6 55%,#22d3ee 130%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;color:transparent;">Mate</span><!--
                   --><span style="display:inline-block;width:7px;height:7px;border-radius:9999px;background:#0f6e58;margin-left:2px;vertical-align:middle;position:relative;top:-2px;"></span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Accent bar -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#0f6e58 0%,#14b8a6 55%,#22d3ee 130%);"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 28px;">
              <h1 style="margin:0 0 20px;font-size:22px;font-weight:800;color:#0d1311;letter-spacing:-0.03em;line-height:1.2;">
                ${escapeHtml(opts.title)}
              </h1>
              ${bodyLines}
              ${button}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="height:1px;background:#e2ddd5;margin:0 36px;"></td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px 28px;background:#faf8f4;">
              <p style="margin:0 0 6px;font-size:12px;color:#8a9490;line-height:1.5;">
                You're receiving this email because you have an account with <strong style="color:#4a5754;">${escapeHtml(opts.storeName)}</strong>.
              </p>
              <p style="margin:0;font-size:12px;color:#8a9490;line-height:1.5;">
                Questions? Reply to this email or contact us at
                <a href="mailto:support@submate.tech" style="color:#0f6e58;text-decoration:none;font-weight:600;">support@submate.tech</a>
              </p>
              <p style="margin:12px 0 0;font-size:11px;color:#b0b8b4;">
                &copy; ${new Date().getFullYear()} SubMate &mdash; Pakistan&rsquo;s digital subscription marketplace.
              </p>
            </td>
          </tr>

        </table>
        <!-- End card -->
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