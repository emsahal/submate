import { Hono } from "hono";
import { config } from "../config.js";
import { storeGmailTokensFromCode } from "../services/gmail.js";

/**
 * Public Google OAuth callback. Google redirects the browser here after the
 * admin consents to Gmail access; we exchange the code and send the browser
 * back to the admin settings page.
 */
export const gmailRoutes = new Hono();

gmailRoutes.get("/oauth/gmail/callback", async (c) => {
  const code = c.req.query("code");
  const error = c.req.query("error");
  const state = c.req.query("state");
  const frontendUrl = config.frontendUrl;

  if (error) {
    return c.redirect(`${frontendUrl}/admin/settings?gmail=error&reason=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return c.redirect(`${frontendUrl}/admin/settings?gmail=error&reason=${encodeURIComponent("Missing authorization code.")}`);
  }

  try {
    const { email } = await storeGmailTokensFromCode(code);
    return c.redirect(`${frontendUrl}/admin/settings?gmail=connected&email=${encodeURIComponent(email)}${state ? `&state=${encodeURIComponent(state)}` : ""}`);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Failed to connect Gmail.";
    return c.redirect(`${frontendUrl}/admin/settings?gmail=error&reason=${encodeURIComponent(reason)}`);
  }
});
