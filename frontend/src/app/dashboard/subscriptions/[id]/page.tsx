"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, BadgeCheck, Check, Copy, KeyRound, Loader2, Lock } from "lucide-react";
import type { SubscriptionDetail } from "@/types/shared";
import { get, post } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { SubscriptionStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { OtpRequestCard } from "@/components/otp-request-card";

export default function SubscriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const [subscription, setSubscription] = React.useState<SubscriptionDetail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  async function reload() {
    get<{ subscription: SubscriptionDetail }>(`/me/subscriptions/${params.id}`)
      .then((data) => setSubscription(data.subscription))
      .catch((err) => setError(formatError(err)));
  }

  React.useEffect(() => {
    reload();
  }, [params.id]);

  async function confirmReceived() {
    setConfirming(true);
    try {
      await post(`/me/subscriptions/${params.id}/confirm`);
      toast.success("Access confirmed. Enjoy your subscription!");
      await reload();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setConfirming(false);
    }
  }

  async function copyAccess() {
    if (!subscription?.access) return;
    try {
      await navigator.clipboard.writeText(subscription.access);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/subscriptions">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <EmptyState title="Subscription not found" description={error} />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const total = Math.max(new Date(subscription.expiryDate).getTime() - new Date(subscription.startDate).getTime(), 1);
  const elapsed = Math.min(Math.max(new Date().getTime() - new Date(subscription.startDate).getTime(), 0), total);
  const pct = Math.round((elapsed / total) * 100);
  const hasMeta = subscription.accessMeta ? Object.keys(subscription.accessMeta).length > 0 : false;
  const hasAccess = Boolean(subscription.access) || hasMeta;
  const isNetflix = subscription.productSlug.toLowerCase().includes("netflix") || subscription.productName.toLowerCase().includes("netflix");
  const showOtpCard = isNetflix && subscription.otp?.enabled === true && subscription.hasCredential;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/dashboard/subscriptions">
            <ArrowLeft className="h-4 w-4" /> Back to subscriptions
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-bold">{subscription.productName}</h1>
          <SubscriptionStatusBadge status={subscription.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {subscription.planName} · {subscription.subscriptionNumber}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Period</span>
            <span>
              {subscription.startDate} → {subscription.expiryDate}
            </span>
          </div>
          <Progress value={subscription.isExpired ? 100 : pct} className={subscription.isExpired ? "opacity-40" : ""} />
          <p className="text-xs text-muted-foreground">
            {subscription.isExpired
              ? "This subscription has expired. Contact support to renew."
              : `${subscription.remainingDays} day${subscription.remainingDays === 1 ? "" : "s"} remaining`}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <KeyRound className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">Your access</CardTitle>
        </CardHeader>
        <CardContent>
          {hasAccess ? (
            <div className="space-y-3">
              {subscription.accessMeta
                ? Object.entries(subscription.accessMeta).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">{key.replace(/_/g, " ")}</p>
                      <p className="break-all font-medium">{value}</p>
                    </div>
                  ))
                : null}
              {subscription.access ? (
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">Access details</p>
                  <pre className="mt-1 overflow-x-auto font-mono text-sm leading-relaxed whitespace-pre-wrap">
                    {subscription.access}
                  </pre>
                  <Button type="button" variant="outline" size="sm" onClick={copyAccess} className="mt-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              ) : null}
              <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" /> These details are encrypted and shown only to you.
              </p>
              <p className="rounded-lg bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                SubMate is an independent subscription platform and is not affiliated with or endorsed by{" "}
                {subscription.productName}.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Access details appear here once your order is fulfilled and an administrator adds them.
            </p>
          )}
        </CardContent>
      </Card>

      {showOtpCard && subscription.otp ? (
        <OtpRequestCard subscriptionId={subscription.id} status={subscription.otp} productName={subscription.productName} />
      ) : null}

      {subscription.userConfirmedAt ? (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="flex items-start gap-3 p-6">
            <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="font-medium text-foreground">Access confirmed</p>
              <p className="text-sm text-muted-foreground">
                You confirmed you received this subscription on {formatDateTime(subscription.userConfirmedAt)}.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <BadgeCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Confirm receipt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Received your access and the subscription is working? Confirm it so we know everything is set up for you.
            </p>
            <Button onClick={confirmReceived} disabled={confirming} variant="success">
              {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {confirming ? "Confirming…" : "Yes, I received my access"}
            </Button>
          </CardContent>
        </Card>
      )}

      {subscription.notes ? (
        <Card>
          <CardHeader>
            <CardDescription className="font-medium text-foreground">Note</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{subscription.notes}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
