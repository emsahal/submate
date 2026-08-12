"use client";

import * as React from "react";
import { BadgeCheck, Check, ImagePlus, KeyRound, ScanLine, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const checks = ["Amount match", "Transaction ID", "Date check", "Readability"];

export function VerificationWorkflow() {
  const [stage, setStage] = React.useState(0);
  const started = React.useRef(false);

  React.useEffect(() => {
    const el = document.getElementById("verification-workflow");
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setStage(5);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started.current) {
            started.current = true;
            setStage(1);
            const delays = [800, 1300, 1100, 900, 900]; // cumulative
            let acc = 0;
            const timers: number[] = delays.map((d, i) => {
              acc += d;
              return window.setTimeout(() => setStage(i + 2), acc);
            });
            observer.disconnect();
            return () => timers.forEach(clearTimeout);
          }
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div id="verification-workflow" className="card-shadow relative rounded-2xl border border-border bg-card p-6 sm:p-7">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading text-lg font-bold tracking-tight">Payment review</p>
          <p className="font-mono text-xs text-muted-foreground">#SUB-10248 · Netflix Monthly</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="animate-pulse-soft h-1.5 w-1.5 rounded-full bg-success" /> Live
        </span>
      </div>

      <div className="mt-6 space-y-2.5">
        {/* Screenshot */}
        <div className={cn("flex items-center gap-4 rounded-xl border p-4 transition-all duration-500", stage >= 1 ? "border-border bg-muted/30" : "border-border/60 opacity-40")}>
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card", stage >= 1 ? "text-primary" : "text-muted-foreground")}>
            <ImagePlus className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Payment screenshot received</p>
            <p className="text-xs text-muted-foreground">Netflix Monthly · Rs 1,250</p>
          </div>
          {stage >= 1 ? <Check className="h-5 w-5 shrink-0 text-success" /> : null}
        </div>

        {/* AI pre-check */}
        <div className={cn("overflow-hidden rounded-xl border p-4 transition-all duration-500", stage >= 2 ? "border-primary/30 bg-accent/40" : "border-border/60 opacity-40")}>
          <div className="flex items-center gap-4">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card", stage >= 2 ? "text-primary" : "text-muted-foreground")}>
              <ScanLine className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">AI pre-check</p>
              <p className="text-xs text-muted-foreground">{stage >= 3 ? "All checks passed" : "Scanning transaction details…"}</p>
            </div>
            {stage >= 3 ? (
              <Check className="h-5 w-5 shrink-0 text-success" />
            ) : stage >= 2 ? (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-border border-t-primary" />
            ) : null}
          </div>
          <div className={cn("mt-3 grid grid-cols-2 gap-2 transition-all duration-500", stage >= 3 ? "opacity-100" : "opacity-0")}>
            {checks.map((c) => (
              <span key={c} className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/85">
                <Check className="h-3.5 w-3.5 text-success" /> {c}
              </span>
            ))}
          </div>
          {stage >= 2 && stage < 3 ? (
            <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-border">
              <span className="animate-scan absolute inset-y-0 w-1/3 bg-primary" />
            </div>
          ) : null}
        </div>

        {/* Human confirmation */}
        <div className={cn("flex items-center gap-4 rounded-xl border p-4 transition-all duration-500", stage >= 4 ? "border-border bg-muted/30" : "border-border/60 opacity-40")}>
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-card", stage >= 4 ? "text-primary" : "text-muted-foreground")}>
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Human confirmation</p>
            <p className="text-xs text-muted-foreground">Approved by an administrator</p>
          </div>
          {stage >= 4 ? <Check className="h-5 w-5 shrink-0 text-success" /> : null}
        </div>

        {/* Access granted */}
        <div
          className={cn(
            "flex items-center gap-4 rounded-xl border p-4 transition-all duration-500",
            stage >= 5 ? "border-success/40 bg-success/10" : "border-border/60 opacity-40",
          )}
        >
          <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-card", stage >= 5 ? "border-success/40 text-success" : "border-border text-muted-foreground")}>
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Access granted</p>
            <p className="text-xs text-muted-foreground">Encrypted credentials revealed to you only</p>
          </div>
          {stage >= 5 ? <BadgeCheck className="h-5 w-5 shrink-0 text-success" /> : null}
        </div>
      </div>
    </div>
  );
}
