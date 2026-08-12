"use client";

import * as React from "react";
import Link from "next/link";
import { Activity, Banknote, ListChecks, MessageSquare, Package, ScrollText, TrendingUp, Users } from "lucide-react";
import type { AdminDashboardStats } from "@shared/types";
import { get } from "@/lib/api";
import { formatPKR, formatNumber } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export default function AdminOverviewPage() {
  const [stats, setStats] = React.useState<AdminDashboardStats | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    get<AdminDashboardStats>("/admin/stats")
      .then(setStats)
      .catch((err) => setError(formatError(err)));
  }, []);

  if (error) {
    return <EmptyState title="Couldn't load stats" description={error} />;
  }
  if (!stats) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Pending payments", value: stats.pendingPayments, icon: ListChecks, href: "/admin/payment-review" },
    { label: "Under review", value: stats.underReview, icon: Activity, href: "/admin/payment-review" },
    { label: "Revenue today", value: formatPKR(stats.todayRevenue), icon: TrendingUp, href: "/admin/orders" },
    { label: "Revenue this month", value: formatPKR(stats.monthRevenue), icon: Banknote, href: "/admin/orders" },
    { label: "Active subscriptions", value: formatNumber(stats.activeSubscriptions), icon: ScrollText, href: "/admin/subscriptions" },
    { label: "Expiring / expired", value: `${stats.expiringSoon} / ${stats.expired}`, icon: ScrollText, href: "/admin/subscriptions" },
    { label: "Pending reviews", value: stats.pendingReviews, icon: MessageSquare, href: "/admin/reviews" },
    { label: "Users", value: `${formatNumber(stats.totalUsers)} (+${stats.newToday})`, icon: Users, href: "/admin/users" },
  ];

  const max7 = Math.max(...stats.revenueLast7Days.map((d) => d.value), 1);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardDescription>{card.label}</CardDescription>
                <card.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue — last 7 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-40 items-end gap-2">
              {stats.revenueLast7Days.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-muted-foreground">{d.value > 0 ? formatPKR(d.value).replace(/\s.*/, "") : ""}</span>
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                    style={{ height: `${Math.max((d.value / max7) * 100, 3)}%` }}
                    title={`${d.day}: ${formatPKR(d.value)}`}
                  />
                  <span className="text-[10px] text-muted-foreground">{d.day.slice(5)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top products</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.map((p) => (
                  <div key={p.slug} className="flex items-center justify-between">
                    <Link href={`/subscriptions/${p.slug}`} className="text-sm font-medium hover:text-primary">
                      {p.name}
                    </Link>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{p.orders} orders</span>
                      <span className="font-semibold text-foreground">{formatPKR(p.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Recent orders</CardTitle>
          <Link href="/admin/orders" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {stats.recentOrders.map((order) => (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center justify-between gap-4 py-3 transition-colors hover:bg-muted/30">
                  <div className="flex min-w-0 items-center gap-3">
                    <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{order.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.orderNumber} · {order.user.name || order.user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatPKR(order.amount)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
