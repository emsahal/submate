import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { Eyebrow, BlurHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} collects and protects your data.`,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <Eyebrow>Legal</Eyebrow>
      <BlurHeading text="Privacy Policy" className="display-2xl mt-5" as="h1" />
      <p className="mt-5 text-sm text-muted-foreground">Last updated: August 2026</p>
      <div className="prose-subly mt-8">
        <p>
          This policy explains what personal data {siteConfig.name} collects, why, and how we protect it.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>
            <strong>Account information:</strong> your name, email and profile picture when you sign in with Google.
          </li>
          <li>
            <strong>Order information:</strong> the products and plans you purchase, your order numbers, and the
            payment method you choose.
          </li>
          <li>
            <strong>Payment proof:</strong> the screenshots you upload for verification.
          </li>
          <li>
            <strong>Usage data:</strong> technical logs (IP address, browser, timestamps) for security and debugging.
          </li>
        </ul>
        <h2>How we use your data</h2>
        <ul>
          <li>To create and manage your orders and subscriptions.</li>
          <li>To verify payments (AI pre-check plus human review).</li>
          <li>To deliver your access details securely.</li>
          <li>To send you important notifications about your orders and subscriptions.</li>
          <li>To prevent fraud and abuse.</li>
        </ul>
        <h2>What we never do</h2>
        <ul>
          <li>We never sell or rent your personal data.</li>
          <li>We never share your credentials or account details with other customers.</li>
          <li>We don't access or store your Google password — authentication happens entirely with Google.</li>
        </ul>
        <h2>How we protect your data</h2>
        <p>
          Access credentials are encrypted at rest (AES-256-GCM) with a key that never touches the database. Payment
          screenshots are stored in private object storage with signed, expiring URLs. Every sensitive admin action is
          written to an audit log.
        </p>
        <h2>Retention</h2>
        <p>
          We keep order and subscription records for as long as your account is active and as required for tax and
          fraud-prevention purposes. Read notifications are periodically removed.
        </p>
        <h2>Your rights</h2>
        <p>
          You can request a copy of your data, ask us to correct it, or delete your account at any time by contacting{" "}
          {siteConfig.supportEmail}.
        </p>
      </div>
    </div>
  );
}
