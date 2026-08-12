import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare } from "lucide-react";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eyebrow, BlurHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the Subly team.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <div className="mb-12 max-w-2xl">
        <Reveal>
          <Eyebrow>Get in touch</Eyebrow>
        </Reveal>
        <BlurHeading text="Contact us" className="display-2xl mt-5" as="h1" />
        <Reveal delay={150}>
          <p className="lead-lg mt-5 text-muted-foreground">We usually reply within a day.</p>
        </Reveal>
      </div>

      <Card className="card-bubble">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> How to reach us
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <p className="font-medium">Email support</p>
                <p className="text-sm text-muted-foreground">{siteConfig.supportEmail}</p>
              </div>
            </div>
            <Button asChild>
              <a href={`mailto:${siteConfig.supportEmail}`}>Send an email</a>
            </Button>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Before you write to us</p>
            <p className="mt-1">
              For order or payment questions, please include your order number. Most questions are answered in our{" "}
              <Link href="/faq" className="text-primary underline underline-offset-4">
                FAQ
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
