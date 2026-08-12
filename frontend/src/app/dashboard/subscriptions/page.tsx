"use client";

import * as React from "react";
import Link from "next/link";
import { BadgeCheck, ScrollText } from "lucide-react";
import type { SubscriptionDetail } from "@/types/shared";
import { get } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { SubscriptionStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionDetail[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    get<{ items: SubscriptionDetail[] }>("/me/subscriptions")
      .then((data) => setSubscriptions(data.items))
      .catch((err) => setError(formatError(err)));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Subscriptions</h1>
        <p className="text-muted-foreground">Active and past subscriptions with your access details.</p>
      </div>

      {error ? (
        <EmptyState title="Couldn't load subscriptions" description={error} />
      ) : !subscriptions ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={<ScrollText className="h-8 w-8" />}
          title="No subscriptions yet"
          description="Subscriptions appear here once an order is fulfilled."
          action={
            <Button asChild>
              <Link href="/subscriptions">Browse subscriptions</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {subscriptions.map((sub) => {
            const total = Math.max(new Date(sub.expiryDate).getTime() - new Date(sub.startDate).getTime(), 1);
            const elapsed = Math.min(Math.max(new Date().getTime() - new Date(sub.startDate).getTime(), 0), total);
            const pct = Math.round((elapsed / total) * 100);
            return (
              <Link key={sub.id} href={`/dashboard/subscriptions/${sub.id}`}>
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <CardTitle className="text-base">{sub.productName}</CardTitle>
                        {sub.userConfirmedAt ? <BadgeCheck className="h-4 w-4 text-emerald-500" aria-label="Confirmed" /> : null}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {sub.planName} · {sub.subscriptionNumber}
                      </p>
                    </div>
                    <SubscriptionStatusBadge status={sub.status} />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Progress value={sub.isExpired ? 100 : pct} className={sub.isExpired ? "opacity-40" : ""} />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{sub.startDate}</span>
                      <span>
                        {sub.isExpired ? "expired" : sub.remainingDays === 0 ? "expires today" : `${sub.remainingDays} days left`}
                      </span>
                      <span>{sub.expiryDate}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
