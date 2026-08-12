"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgeCheck, Bell, CheckCircle2, Package, ScrollText } from "lucide-react";
import type { CustomerOverview, OrderDetail, SubscriptionDetail } from "@shared/types";
import { get } from "@/lib/api";
import { formatPKR, relativeTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge, SubscriptionStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

export default function DashboardOverviewPage() {
  const [overview, setOverview] = React.useState<CustomerOverview | null>(null);
  const [orders, setOrders] = React.useState<OrderDetail[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<SubscriptionDetail[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const [ov, or, subs] = await Promise.all([
          get<CustomerOverview>("/me/overview"),
          get<{ items: OrderDetail[] }>("/me/orders?limit=5"),
          get<{ items: SubscriptionDetail[] }>("/me/subscriptions?limit=5"),
        ]);
        setOverview(ov);
        setOrders(or.items);
        setSubscriptions(subs.items);
      } catch (err) {
        setError(formatError(err));
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold">Overview</h1>
        <EmptyState title="Couldn't load your dashboard" description={error} />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold">Overview</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Active subscriptions", value: overview.activeSubscriptions, icon: ScrollText, href: "/dashboard/subscriptions" },
    { label: "Pending orders", value: overview.pendingOrders, icon: Package, href: "/dashboard/orders" },
    { label: "Expiring soon", value: overview.expiringSoon, icon: AlertTriangle, href: "/dashboard/subscriptions" },
    { label: "Notifications", value: overview.unreadNotifications, icon: Bell, href: "/dashboard/notifications" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Overview</h1>
        <p className="text-muted-foreground">Here's what's happening with your subscriptions.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>{stat.label}</CardDescription>
                <stat.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent orders</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/orders">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {orders.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <Package className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No orders yet.</p>
                <Button asChild size="sm">
                  <Link href="/subscriptions">Browse subscriptions</Link>
                </Button>
              </div>
            ) : (
              orders.map((order) => (
                <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-primary/50">
                  <div>
                    <p className="text-sm font-medium">
                      {order.productName} · {order.planName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.orderNumber} · {relativeTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-primary">{formatPKR(order.amount)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Subscriptions</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/subscriptions">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscriptions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No subscriptions yet. They appear here after your order is fulfilled.</p>
              </div>
            ) : (
              subscriptions.map((sub) => (
                <Link key={sub.id} href={`/dashboard/subscriptions/${sub.id}`} className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:border-primary/50">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      {sub.productName}
                      {sub.userConfirmedAt ? <BadgeCheck className="h-4 w-4 text-emerald-500" aria-label="Confirmed" /> : null}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sub.planName} · expires {sub.expiryDate}
                    </p>
                  </div>
                  <SubscriptionStatusBadge status={sub.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
