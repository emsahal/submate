"use client";

import * as React from "react";
import Link from "next/link";
import { ListChecks } from "lucide-react";
import type { PaymentDetail } from "@shared/types";
import { get } from "@/lib/api";
import { formatPKR, relativeTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentStatusBadge, AiVerdictBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

type QueueItem = { payment: PaymentDetail; order: { id: number; orderNumber: string; productName: string; planName: string } };

export default function PaymentReviewPage() {
  const [items, setItems] = React.useState<QueueItem[] | null>(null);
  const [status, setStatus] = React.useState("SUBMITTED");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    get<QueueItem[]>(`/admin/payments?status=${status}`)
      .then(setItems)
      .catch((err) => setError(formatError(err)));
  }, [status]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Payment review</h1>
          <p className="text-muted-foreground">Review submitted payments and make the final call.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SUBMITTED">Submitted</SelectItem>
            <SelectItem value="AI_REVIEWED">AI reviewed</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="REQUEST_REUPLOAD">Re-upload requested</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <EmptyState title="Couldn't load payments" description={error} />
      ) : !items ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<ListChecks className="h-8 w-8" />} title="Nothing here" description="No payments match this filter." />
      ) : (
        <div className="space-y-3">
          {items.map(({ payment, order }) => (
            <Link key={payment.id} href={`/admin/payment-review/${payment.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{order.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.orderNumber} · {payment.methodName ?? "—"} · {relativeTime(payment.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatPKR(payment.amount)}</span>
                    <AiVerdictBadge status={payment.aiStatus} />
                    <PaymentStatusBadge status={payment.status} />
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
