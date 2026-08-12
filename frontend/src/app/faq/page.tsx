import type { Metadata } from "next";
import type { PublicFaq } from "@/types/shared";
import { fetchFaqs } from "@/lib/site-data";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { EmptyState } from "@/components/empty-state";
import { Eyebrow, BlurHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about Subly payments, delivery and subscriptions.",
};

export default async function FaqPage() {
  let faqs: PublicFaq[] = [];
  try {
    faqs = await fetchFaqs();
  } catch {
    faqs = [];
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <div className="mb-12 max-w-2xl">
        <Reveal>
          <Eyebrow>Help center</Eyebrow>
        </Reveal>
        <BlurHeading text="Frequently asked questions" className="display-2xl mt-5" as="h1" />
        <Reveal delay={150}>
          <p className="lead-lg mt-5 text-muted-foreground">Everything about payments, verification and delivery.</p>
        </Reveal>
      </div>

      {faqs.length === 0 ? (
        <EmptyState title="No FAQs yet" description="Check back soon." />
      ) : (
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={String(faq.id)}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
