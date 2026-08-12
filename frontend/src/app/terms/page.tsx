import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { Eyebrow, BlurHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The terms that govern your use of ${siteConfig.name}.`,
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <Eyebrow>Legal</Eyebrow>
      <BlurHeading text="Terms of Service" className="display-2xl mt-5" as="h1" />
      <p className="mt-5 text-sm text-muted-foreground">Last updated: August 2026</p>
      <div className="prose-subly mt-8">
        <p>
          By using {siteConfig.name} you agree to these terms. Read them carefully before placing an order.
        </p>
        <h2>1. What we are</h2>
        <p>
          {siteConfig.name} is a marketplace that helps you discover and purchase eligible digital subscription plans.
          We are not an official reseller or agent of the brands listed on this site, and we make no claim that any
          brand endorses us.
        </p>
        <h2>2. Eligibility and lawful use</h2>
        <ul>
          <li>You must be 18 or older (or have parental consent) to place an order.</li>
          <li>
            You may only purchase a plan if you are legally eligible and the provider allows it for your region and
            usage. This is your responsibility.
          </li>
          <li>You must not use Subly to bypass geographic restrictions, DRM, or account-sharing rules.</li>
          <li>You must not resell, share, or sublicense the access you receive.</li>
        </ul>
        <h2>3. Orders and payment</h2>
        <ul>
          <li>Prices are shown in PKR and are the final price at checkout.</li>
          <li>Payments are made manually (JazzCash, Easypaisa, or bank transfer) and verified by our team.</li>
          <li>Submitting fake or edited payment proof is fraud and will result in account suspension.</li>
        </ul>
        <h2>4. Delivery</h2>
        <p>
          Once your payment is approved, your order is fulfilled and your subscription becomes active. We aim to do
          this within 24 hours. Delays can happen during holidays or high volume; we'll keep you updated.
        </p>
        <h2>5. Refunds</h2>
        <p>
          If we cannot deliver the subscription you paid for, you get a full refund. Because access is delivered
          instantly, fulfilled orders are not refundable. See our Refund Policy for details.
        </p>
        <h2>6. Acceptable use</h2>
        <ul>
          <li>You will not attempt to access another customer's account, data, or credentials.</li>
          <li>You will not attack, probe, or disrupt our services.</li>
          <li>You will not upload malware or abusive content.</li>
        </ul>
        <h2>7. Account suspension</h2>
        <p>
          We may suspend or cancel your account for fraud, abuse, or breach of these terms. Suspended accounts cannot
          place orders or access credentials.
        </p>
        <h2>8. Liability</h2>
        <p>
          We provide the marketplace "as is." Our total liability is limited to the amount you paid us for the order in
          question. We are not liable for how you use the subscriptions you purchase.
        </p>
        <h2>9. Changes</h2>
        <p>We may update these terms. Material changes will be announced on the site or by email.</p>
        <p>
          Questions? Contact {siteConfig.supportEmail}.
        </p>
      </div>
    </div>
  );
}
