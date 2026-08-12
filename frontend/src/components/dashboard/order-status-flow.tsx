"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, XCircle } from "lucide-react";

const STEPS = [
  { key: "created", label: "Created" },
  { key: "payment", label: "Payment" },
  { key: "submitted", label: "Submitted" },
  { key: "review", label: "Verification" },
  { key: "fulfilled", label: "Fulfilled" },
];

function stepIndexForStatus(status: string): number {
  switch (status) {
    case "PENDING_PAYMENT":
      return 1;
    case "PAYMENT_SUBMITTED":
    case "AI_REVIEWED":
      return 2;
    case "UNDER_ADMIN_REVIEW":
      return 3;
    case "APPROVED":
      return 3;
    case "FULFILLED":
      return 4;
    default:
      return 0;
  }
}

export function OrderStatusFlow({ status }: { status: string }) {
  const current = stepIndexForStatus(status);
  const failed = status === "REJECTED" || status === "CANCELLED" || status === "EXPIRED";

  return (
    <div className="flex items-center">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center gap-1.5">
              {failed && active ? (
                <XCircle className="h-6 w-6 text-destructive" />
              ) : done ? (
                <CheckCircle2 className="h-6 w-6 text-success" />
              ) : (
                <Circle className={cn("h-6 w-6", active ? "text-primary" : "text-muted-foreground/40")} />
              )}
              <span className={cn("text-xs", active ? "font-semibold text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/50")}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <div className={cn("mx-2 mb-5 h-0.5 flex-1 rounded-full", i < current ? "bg-success" : "bg-border")} />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
