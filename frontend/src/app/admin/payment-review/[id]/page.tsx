"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, Loader2, RefreshCw, Undo2 } from "lucide-react";
import type { PaymentDetail, AIVerificationResult } from "@shared/types";
import { get, post } from "@/lib/api";
import { formatPKR, formatDateTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PaymentStatusBadge, AiVerdictBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

type ReviewData = {
  payment: PaymentDetail;
  order: { id: number; orderNumber: string; productName: string; planName: string; amount: number; currency: string } | null;
  user: { id: string; name: string; email: string } | null;
};

export default function PaymentReviewDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = React.useState<ReviewData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  async function load() {
    try {
      const d = await get<ReviewData>(`/admin/payments/${params.id}/review`);
      setData(d);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function decide(decision: "APPROVE" | "REJECT" | "REQUEST_REUPLOAD") {
    setBusy(decision);
    try {
      await post(`/admin/payments/${params.id}/decision`, { decision, note: note || undefined });
      toast.success("Decision recorded.");
      router.push("/admin/payment-review");
    } catch (err) {
      toast.error(formatError(err));
      setBusy(null);
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/payment-review">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <EmptyState title="Payment not found" description={error} />
      </div>
    );
  }
  if (!data) {
    return <Skeleton className="h-96" />;
  }

  const { payment, order, user } = data;
  const ai = payment.aiResult as AIVerificationResult | null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/admin/payment-review">
              <ArrowLeft className="h-4 w-4" /> Back to queue
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold">{order?.productName ?? "Payment"}</h1>
            <PaymentStatusBadge status={payment.status} />
            <AiVerdictBadge status={payment.aiStatus} />
          </div>
          <p className="text-sm text-muted-foreground">
            {order?.orderNumber} · submitted {formatDateTime(payment.submittedAt ?? payment.createdAt)}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Screenshots */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Screenshots</CardTitle>
              <CardDescription>Click to view full size in a new tab.</CardDescription>
            </CardHeader>
            <CardContent>
              {payment.screenshots.length === 0 ? (
                <p className="text-sm text-muted-foreground">No screenshot uploaded.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {payment.screenshots.map((shot) =>
                    shot.viewedUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a key={shot.id} href={shot.viewedUrl} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-lg border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shot.viewedUrl} alt={shot.fileName ?? "screenshot"} className="max-h-72 object-contain" />
                      </a>
                    ) : null,
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI result */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI verification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {payment.aiError ? (
                <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">AI analysis failed: {payment.aiError}</p>
              ) : ai ? (
                <div className="space-y-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">Model: {payment.aiModel ?? "n/a"}</Badge>
                    {payment.aiConfidence != null ? <Badge variant="secondary">Confidence: {Math.round(payment.aiConfidence * 100)}%</Badge> : null}
                    {payment.aiAnalyzedAt ? <Badge variant="secondary">Analyzed {formatDateTime(payment.aiAnalyzedAt)}</Badge> : null}
                  </div>
                  <div className="grid gap-2 rounded-md bg-muted/40 p-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Expected</p>
                      <p className="font-medium">{formatPKR(payment.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Detected amount</p>
                      <p className="font-medium">{ai.amount != null ? formatPKR(ai.amount) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transaction ID</p>
                      <p className="break-all font-mono text-xs">{ai.transactionId ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Payment date</p>
                      <p className="font-medium">{ai.paymentDate ?? "—"}</p>
                    </div>
                  </div>
                  {ai.summary ? <p>{ai.summary}</p> : null}
                  {ai.issues.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-warning">Issues</p>
                      <ul className="list-inside list-disc text-xs text-warning">
                        {ai.issues.map((i) => (
                          <li key={i}>{i}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {ai.missing.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Missing</p>
                      <ul className="list-inside list-disc text-xs text-muted-foreground">
                        {ai.missing.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">AI analysis pending or not configured.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Decision */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order</span>
                <Link href={`/admin/orders/${order?.id}`} className="font-medium text-primary hover:underline">
                  {order?.orderNumber}
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plan</span>
                <span>{order?.planName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-semibold">{formatPKR(payment.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span>{payment.methodName ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span>{user?.name || user?.email}</span>
              </div>
              {payment.adminNote ? (
                <div className="rounded-md bg-muted/40 p-2 text-xs">
                  <span className="font-medium">Previous note:</span> {payment.adminNote}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Decision</CardTitle>
              <CardDescription>You have the final say. AI is only a hint.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="note">Note (shown to customer)</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="e.g. Please send the screenshot showing the full transaction ID." />
              </div>
              <div className="grid gap-2">
                <Button onClick={() => decide("APPROVE")} disabled={!!busy} className="w-full" variant="success">
                  {busy === "APPROVE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve payment
                </Button>
                <Button onClick={() => decide("REQUEST_REUPLOAD")} disabled={!!busy} className="w-full" variant="outline">
                  {busy === "REQUEST_REUPLOAD" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                  Request re-upload
                </Button>
                <Button onClick={() => decide("REJECT")} disabled={!!busy} className="w-full" variant="destructive">
                  {busy === "REJECT" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Reject payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
