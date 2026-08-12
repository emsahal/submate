"use client";

import * as React from "react";
import { Banknote, ImagePlus, KeyRound, MousePointerClick } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  n: string;
  title: string;
  body: string;
  icon: React.ComponentType<{ className?: string }>;
};

const steps: Step[] = [
  {
    n: "01",
    title: "Choose a plan",
    body: "Pick the subscription and duration that fits you — every price shown in PKR, up front.",
    icon: MousePointerClick,
  },
  {
    n: "02",
    title: "Pay like a local",
    body: "Send the exact amount via JazzCash, Easypaisa or bank transfer. No card needed.",
    icon: Banknote,
  },
  {
    n: "03",
    title: "Upload proof",
    body: "Attach your payment screenshot. AI pre-checks it in the background, instantly.",
    icon: ImagePlus,
  },
  {
    n: "04",
    title: "Get verified & access",
    body: "An admin confirms your payment and delivers your encrypted access to your dashboard.",
    icon: KeyRound,
  },
];

export function HowItWorksTimeline() {
  return (
    <ol className="border-t border-border">
      {steps.map((step, i) => {
        const Icon = step.icon;
        return (
          <li key={step.n} className="group">
            <div
              className={cn(
                "flex flex-col gap-5 py-9 sm:flex-row sm:items-center sm:gap-8 sm:py-10",
                i < steps.length - 1 && "border-b border-border",
              )}
            >
              {/* Number node */}
              <div className="flex items-center gap-4 sm:shrink-0">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-border bg-card font-heading text-lg font-bold text-primary transition-colors duration-300 group-hover:border-primary/40 group-hover:bg-accent group-hover:text-primary">
                  {step.n}
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted text-primary transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-accent sm:hidden">
                  <Icon className="h-5 w-5" />
                </span>
              </div>

              {/* Copy */}
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                    Step {step.n}
                  </span>
                  <span className="hidden h-px w-10 bg-border sm:block" />
                </div>
                <h3 className="mt-2 font-heading text-xl font-bold tracking-tight sm:text-2xl">{step.title}</h3>
                <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{step.body}</p>
              </div>

              {/* Icon */}
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-primary transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-accent sm:flex">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
