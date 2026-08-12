"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { get } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SubscriptionStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

type AdminSubRow = {
  id: number;
  subscriptionNumber: string;
  userId: string;
  userName: string | null;
  productName: string;
  planName: string;
  startDate: string;
  expiryDate: string;
  status: string;
  renewalStatus: string;
  createdAt: string;
};

export default function AdminSubscriptionsPage() {
  const [items, setItems] = React.useState<AdminSubRow[] | null>(null);
  const [status, setStatus] = React.useState("all");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    get<{ items: AdminSubRow[] }>(`/admin/subscriptions${status !== "all" ? `?status=${status}` : ""}`)
      .then((d) => setItems(d.items))
      .catch((err) => setError(formatError(err)));
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">Active, expiring and past subscriptions.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[190px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="EXPIRING_SOON">Expiring soon</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="RENEWAL_PENDING">Renewal pending</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <EmptyState title="Couldn't load subscriptions" description={error} />
      ) : !items ? (
        <Skeleton className="h-96" />
      ) : items.length === 0 ? (
        <EmptyState icon={<CalendarClock className="h-8 w-8" />} title="No subscriptions" description="No subscriptions match this filter." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Subscription</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Renewal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((s) => (
                    <tr key={s.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/admin/subscriptions/${s.id}`} className="font-mono text-xs font-medium text-primary hover:underline">
                          {s.subscriptionNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{s.userName || s.userId}</td>
                      <td className="px-4 py-3">
                        {s.productName} · {s.planName}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(s.startDate)} → {formatDate(s.expiryDate)}
                      </td>
                      <td className="px-4 py-3">
                        <SubscriptionStatusBadge status={s.status as never} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.renewalStatus.replace("_", " ").toLowerCase()}</td>
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
