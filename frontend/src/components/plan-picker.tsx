"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, Monitor, ShoppingCart } from "lucide-react";
import type { PublicPlan } from "@/types/shared";
import { formatPKR } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { useSession, signInWithGoogle } from "@/lib/auth-client";
import { post } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SCREEN_OPTIONS = [1, 2, 3, 4, 5] as const;

export function PlanPicker({ productId, slug, plans }: { productId: number; slug: string; plans: PublicPlan[] }) {
  const router = useRouter();
  const session = useSession();
  const visiblePlans = React.useMemo(() => {
    const monthly = plans.filter((p) => p.durationDays <= 31);
    return monthly.length > 0 ? monthly : plans;
  }, [plans]);
  const [selectedId, setSelectedId] = React.useState<number | null>(visiblePlans.find((p) => p)?.id ?? null);
  const [screens, setScreens] = React.useState<number>(1);
  const [submitting, setSubmitting] = React.useState(false);

  if (visiblePlans.length === 0) {
    return <p className="text-sm text-muted-foreground">No plans available right now.</p>;
  }

  const selectedPlan = visiblePlans.find((p) => p.id === selectedId) ?? null;
  const totalPrice = selectedPlan ? selectedPlan.priceLocal * screens : 0;

  async function handleBuy() {
    if (!selectedId) return;
    if (!session.data) {
      signInWithGoogle(`/subscriptions/${slug}?buy=1`);
      return;
    }
    setSubmitting(true);
    try {
      const data = await post<{ order: { id: number } }>("/me/orders", {
        productId,
        planId: selectedId,
        screens,
      });
      toast.success(
        screens > 1
          ? `Order created for ${screens} screens — complete your payment to activate.`
          : "Order created — complete your payment to activate.",
      );
      router.push(`/dashboard/orders/${data.order.id}`);
    } catch (err) {
      toast.error(formatError(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Plan selector */}
      <div className="space-y-3">
        {visiblePlans.map((plan) => {
          const active = plan.id === selectedId;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedId(plan.id)}
              className={cn(
                "flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors",
                active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40",
              )}
              aria-pressed={active}
            >
              <div>
                <p className="font-semibold">{plan.name}</p>
                <p className="text-sm text-muted-foreground">
                  {plan.durationDays} day{plan.durationDays === 1 ? "" : "s"}
                  {plan.description ? ` · ${plan.description}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-primary">{formatPKR(plan.priceLocal)}</span>
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full border",
                    active ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                  )}
                >
                  {active ? <Check className="h-3 w-3" /> : null}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Screens selector */}
      <div className="space-y-2">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <Monitor className="h-4 w-4 text-primary" />
          Number of screens
        </p>
        <div className="grid grid-cols-5 gap-2">
          {SCREEN_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setScreens(n)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg border py-2.5 text-sm font-semibold transition-colors",
                screens === n
                  ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                  : "border-border text-foreground hover:border-primary/40",
              )}
              aria-pressed={screens === n}
            >
              <span className="text-base">{n}</span>
              <span className="text-[10px] font-normal text-muted-foreground">{n === 1 ? "screen" : "screens"}</span>
            </button>
          ))}
        </div>
        {screens > 1 && selectedPlan ? (
          <p className="text-xs text-muted-foreground">
            {screens} × {formatPKR(selectedPlan.priceLocal)} ={" "}
            <span className="font-semibold text-foreground">{formatPKR(totalPrice)}</span> total
          </p>
        ) : null}
      </div>

      <Button onClick={handleBuy} disabled={submitting || !selectedId} size="lg" className="w-full">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
        {session.data
          ? screens > 1
            ? `Continue to payment · ${formatPKR(totalPrice)}`
            : "Continue to payment"
          : "Sign in to order"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Pay with JazzCash, Easypaisa or bank transfer. Your access is delivered after admin verification.
      </p>
    </div>
  );
}
