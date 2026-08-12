import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { Eyebrow, BlurHeading } from "@/components/section-heading";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `The refund policy for ${siteConfig.name}.`,
};

export default function RefundPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <Eyebrow>Legal</Eyebrow>
      <BlurHeading text="Refund Policy" className="display-2xl mt-5" as="h1" />
      <p className="mt-5 text-sm text-muted-foreground">Last updated: August 2026</p>
      <div className="prose-subly mt-8">
        <p>Our goal is simple: you should only pay for what you actually receive.</p>
        <h2>You get a full refund when</h2>
        <ul>
          <li>We cannot deliver the subscription you paid for.</li>
          <li>Your payment is approved but the product becomes unavailable before fulfilment.</li>
          <li>We make an error on our side that prevents delivery.</li>
        </ul>
        <h2>What is not refundable</h2>
        <ul>
          <li>
            <strong>Fulfilled orders:</strong> once access has been delivered and your subscription activated, the order
            is complete. Digital goods are not returnable.
          </li>
          <li>
            <strong>Missed use:</strong> we don't refund because you forgot to use or renew a subscription. Renewal
            reminders are sent 7, 3 and 1 day before expiry.
          </li>
          <li>
            <strong>Provider changes:</strong> we're not responsible for price or feature changes made by the provider
            during your subscription.
          </li>
        </ul>
        <h2>How to request a refund</h2>
        <p>
          Email {siteConfig.supportEmail} with your order number and the reason. We respond within 1–2 business days.
          Approved refunds are returned through the same method you paid with.
        </p>
        <h2>Timing</h2>
        <p>
          Refunds are usually processed within 3–5 business days after approval. Bank transfers can take a little
          longer depending on your bank.
        </p>
      </div>
    </div>
  );
}
