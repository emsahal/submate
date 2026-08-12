"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Ban, Clock, Loader2, RefreshCw } from "lucide-react";
import type { OrderDetail, PaymentDetail } from "@shared/types";
import { get, post } from "@/lib/api";
import { formatPKR, formatDateTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusBadge, PaymentStatusBadge, AiVerdictBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { OrderStatusFlow } from "@/components/dashboard/order-status-flow";
import { PaymentUpload } from "@/components/dashboard/payment-upload";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState(false);

  async function load() {
    try {
      const data = await get<{ order: OrderDetail }>(`/me/orders/${params.id}`);
      setOrder(data.order);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function cancelOrder() {
    setCancelling(true);
    try {
      const data = await post<{ order: OrderDetail }>(`/me/orders/${params.id}/cancel`);
      setOrder(data.order);
      toast.success("Order cancelled.");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setCancelling(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/orders">
            <ArrowLeft className="h-4 w-4" /> Back to orders
          </Link>
        </Button>
        <EmptyState title="Order not found" description={error} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const expiredWindow = order.status === "PENDING_PAYMENT" && order.expiresAt && new Date(order.expiresAt).getTime() < Date.now();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/dashboard/orders">
              <ArrowLeft className="h-4 w-4" /> Back to orders
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold">{order.productName}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {order.orderNumber} · {order.planName} · placed {formatDateTime(order.createdAt)}
          </p>
        </div>
        {order.status === "PENDING_PAYMENT" ? (
          <Button variant="outline" onClick={cancelOrder} disabled={cancelling}>
            {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            Cancel order
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-6">
          <OrderStatusFlow status={order.status} />
        </CardContent>
      </Card>

      {expiredWindow ? (
        <div className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <Clock className="h-5 w-5 text-warning" />
          <p>
            This order is no longer open for payment because the payment window expired. Please place a new order.
          </p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Payment actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Amount due</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{formatPKR(order.amount)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Pay the exact amount, then upload proof for verification.
              </p>
            </CardContent>
          </Card>

          {order.canSubmitPayment && order.paymentMethods.length > 0 ? (
            <PaymentUpload order={order} methods={order.paymentMethods} onSubmitted={load} />
          ) : null}
        </div>

        {/* Payment attempts */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Payment history</CardTitle>
              <Button variant="ghost" size="icon" onClick={load} aria-label="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payment submissions yet.</p>
              ) : (
                order.payments.map((payment) => <PaymentAttemptCard key={payment.id} payment={payment} />)
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PaymentAttemptCard({ payment }: { payment: PaymentDetail }) {
  const ai = payment.aiResult;
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <PaymentStatusBadge status={payment.status} />
          <AiVerdictBadge status={payment.aiStatus} />
        </div>
        <span className="text-xs text-muted-foreground">{formatDateTime(payment.submittedAt ?? payment.createdAt)}</span>
      </div>

      {ai ? (
        <div className="rounded-md bg-muted/40 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {ai.amount != null ? (
              <span>
                Amount detected: <strong className="text-foreground">{formatPKR(ai.amount)}</strong>
              </span>
            ) : null}
            {ai.transactionId ? (
              <span>
                TXN: <span className="font-mono">{ai.transactionId}</span>
              </span>
            ) : null}
            {payment.aiConfidence != null ? <span>Confidence: {Math.round(payment.aiConfidence * 100)}%</span> : null}
          </div>
          {ai.summary ? <p className="mt-1.5 text-xs text-muted-foreground">{ai.summary}</p> : null}
          {ai.issues.length > 0 ? (
            <ul className="mt-1.5 space-y-0.5 text-xs text-warning">
              {ai.issues.map((issue) => (
                <li key={issue}>• {issue}</li>
              ))}
            </ul>
          ) : null}
          {payment.aiError ? <p className="mt-1.5 text-xs text-destructive">AI analysis failed: {payment.aiError}</p> : null}
        </div>
      ) : null}

      {payment.adminNote ? (
        <p className="rounded-md border border-border bg-background p-2.5 text-xs">
          <span className="font-medium">Admin note:</span> {payment.adminNote}
        </p>
      ) : null}

      {payment.screenshots.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {payment.screenshots.map((shot) =>
            shot.viewedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <a key={shot.id} href={shot.viewedUrl} target="_blank" rel="noopener noreferrer" className="group">
                <div className="relative h-16 w-20 overflow-hidden rounded-md border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.viewedUrl} alt={shot.fileName ?? "payment screenshot"} className="h-full w-full object-cover transition-opacity group-hover:opacity-80" />
                </div>
              </a>
            ) : null,
          )}
        </div>
      ) : null}
    </div>
  );
}
