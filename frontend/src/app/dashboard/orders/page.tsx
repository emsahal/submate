"use client";

import * as React from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import type { OrderDetail } from "@/types/shared";
import { get } from "@/lib/api";
import { formatPKR, formatDateTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

export default function OrdersPage() {
  const [orders, setOrders] = React.useState<OrderDetail[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    get<{ items: OrderDetail[] }>("/me/orders")
      .then((data) => setOrders(data.items))
      .catch((err) => setError(formatError(err)));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Orders</h1>
        <p className="text-muted-foreground">Track your orders and complete payments.</p>
      </div>

      {error ? (
        <EmptyState title="Couldn't load orders" description={error} />
      ) : !orders ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No orders yet"
          description="Browse subscriptions and place your first order."
          action={
            <Button asChild>
              <Link href="/subscriptions">Browse subscriptions</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/dashboard/orders/${order.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {order.productName} · {order.planName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {order.orderNumber} · placed {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-primary">{formatPKR(order.amount)}</span>
                    <OrderStatusBadge status={order.status} />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
