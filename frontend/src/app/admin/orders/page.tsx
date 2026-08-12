"use client";

import * as React from "react";
import Link from "next/link";
import { Package } from "lucide-react";
import type { OrderStatus } from "@shared/types";
import { get } from "@/lib/api";
import { formatPKR, formatDateTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrderStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

type AdminOrderRow = {
  id: number;
  orderNumber: string;
  userEmail: string;
  username: string | null;
  productName: string;
  planName: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
};

export default function AdminOrdersPage() {
  const [items, setItems] = React.useState<AdminOrderRow[] | null>(null);
  const [status, setStatus] = React.useState("all");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    get<{ items: AdminOrderRow[] }>(`/admin/orders${status !== "all" ? `?status=${status}` : ""}`)
      .then((d) => setItems(d.items))
      .catch((err) => setError(formatError(err)));
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Orders</h1>
          <p className="text-muted-foreground">All orders across the store.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING_PAYMENT">Pending payment</SelectItem>
            <SelectItem value="PAYMENT_SUBMITTED">Payment submitted</SelectItem>
            <SelectItem value="UNDER_ADMIN_REVIEW">Under review</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="FULFILLED">Fulfilled</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <EmptyState title="Couldn't load orders" description={error} />
      ) : !items ? (
        <Skeleton className="h-96" />
      ) : items.length === 0 ? (
        <EmptyState icon={<Package className="h-8 w-8" />} title="No orders" description="No orders match this filter." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((order) => (
                    <tr key={order.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/admin/orders/${order.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                          {order.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{order.username || order.userEmail}</td>
                      <td className="px-4 py-3">
                        {order.productName} · {order.planName}
                      </td>
                      <td className="px-4 py-3 font-medium">{formatPKR(order.amount)}</td>
                      <td className="px-4 py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDateTime(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
