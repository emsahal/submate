import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { Eyebrow, BlurHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "About",
  description: `Learn more about ${siteConfig.name}.`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <Reveal>
        <Eyebrow>Who we are</Eyebrow>
      </Reveal>
      <BlurHeading text={`About ${siteConfig.name}`} className="display-2xl mt-5" as="h1" />
      <Reveal delay={150}>
        <p className="lead-lg mt-5 text-muted-foreground">
          A marketplace that makes global digital subscriptions payable locally — in PKR, with a human in the loop.
        </p>
      </Reveal>
      <div className="prose-subly mt-10">
        <p>
          {siteConfig.name} is a marketplace that helps people in Pakistan discover and manage eligible digital
          subscription plans. Many international platforms are hard to pay for locally — international cards are
          limited, and banks often block overseas transactions.
        </p>
        <p>We solve that with a simple, transparent flow:</p>
        <ul>
          <li>Pay with JazzCash, Easypaisa or a local bank transfer in PKR.</li>
          <li>Upload your payment proof and our AI pre-checks it.</li>
          <li>A human administrator confirms it — the final decision is always human.</li>
          <li>Your encrypted access details appear in your dashboard.</li>
        </ul>
        <h2>What we are — and aren't</h2>
        <p>
          We are a marketplace, not an official reseller or agent of any brand. Every product page lists its eligibility
          requirements. We only list subscriptions where the provider's terms and applicable law allow them. We never
          share accounts or bypass restrictions.
        </p>
        <h2>Our commitments</h2>
        <ul>
          <li>
            <strong>Honesty:</strong> if we can't deliver, you get a full refund.
          </li>
          <li>
            <strong>Security:</strong> your credentials are encrypted, and every sensitive action is audited.
          </li>
          <li>
            <strong>Human review:</strong> AI assists with payment verification, but admins always have the final word.
          </li>
        </ul>
      </div>
    </div>
  );
}
