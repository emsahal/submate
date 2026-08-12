"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Loader2 } from "lucide-react";
import type { OrderDetail } from "@/types/shared";
import { get, post } from "@/lib/api";
import { formatPKR, formatDateTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

type AdminOrderDetail = OrderDetail & {
  userId: string;
  user: { id: string; name: string; email: string };
  adminNote: string | null;
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = React.useState<AdminOrderDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    get<AdminOrderDetail>(`/admin/orders/${params.id}`)
      .then(setOrder)
      .catch((err) => setError(formatError(err)));
  }, [params.id]);

  async function fulfill() {
    setBusy(true);
    try {
      const res = await post<{ subscription: { id: number } }>(`/admin/orders/${params.id}/fulfill`, { notes: notes || undefined });
      toast.success("Order fulfilled.");
      router.push(`/admin/subscriptions/${res.subscription.id}`);
    } catch (err) {
      toast.error(formatError(err));
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <EmptyState title="Order not found" description={error} />
      </div>
    );
  }
  if (!order) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/admin/orders">
              <ArrowLeft className="h-4 w-4" /> Back to orders
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold">{order.productName}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {order.orderNumber} · created {formatDateTime(order.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="font-medium">{order.planName}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Duration</dt>
                  <dd>{order.planDurationDays} days</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Amount</dt>
                  <dd className="font-semibold">{formatPKR(order.amount)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Product</dt>
                  <dd>
                    <Link href={`/subscriptions/${order.productSlug}`} className="text-primary hover:underline">
                      {order.productSlug}
                    </Link>
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-1.5 pt-2 text-xs text-muted-foreground">
                {order.submittedAt ? <span>Submitted {formatDateTime(order.submittedAt)}</span> : null}
                {order.approvedAt ? <span>· Approved {formatDateTime(order.approvedAt)}</span> : null}
                {order.fulfilledAt ? <span>· Fulfilled {formatDateTime(order.fulfilledAt)}</span> : null}
                {order.expiresAt ? <span>· Order expires {formatDateTime(order.expiresAt)}</span> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payments</CardTitle>
            </CardHeader>
            <CardContent>
              {order.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment submitted yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {order.payments.map((p) => (
                    <Link key={p.id} href={`/admin/payment-review/${p.id}`} className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">
                          {p.methodName} · {formatPKR(p.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</p>
                      </div>
                      <PaymentStatusBadge status={p.status} />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-medium">{order.user.name || order.user.email}</p>
              <p className="text-muted-foreground">{order.user.email}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fulfill order</CardTitle>
              <CardDescription>Creates a subscription starting today. Only approved orders can be fulfilled.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional note recorded on the subscription." />
              </div>
              <Button onClick={fulfill} disabled={busy || order.status !== "APPROVED"} className="w-full" variant="success">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BadgeCheck className="h-4 w-4" />}
                Fulfill order
              </Button>
              {order.status !== "APPROVED" ? (
                <p className="text-xs text-muted-foreground">Approve the payment first, then come back to fulfill.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
