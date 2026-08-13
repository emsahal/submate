"use client";

import * as React from "react";
import { AlertCircle, Check, Clock, Copy, KeyRound, Loader2, MessageCircle } from "lucide-react";
import type { SubscriptionOtpStatus } from "@/types/shared";
import { post } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OtpRequestResult {
  code: string;
  expiresAt: string;
  used: number;
  limit: number;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function OtpRequestCard({
  subscriptionId,
  status,
  productName,
}: {
  subscriptionId: number;
  status: SubscriptionOtpStatus;
  productName?: string | null;
}) {
  const [used, setUsed] = React.useState(status.used);
  const [canRequest, setCanRequest] = React.useState(status.canRequest);
  const [loading, setLoading] = React.useState(false);
  const [code, setCode] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<string | null>(status.activeExpiresAt);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [now, setNow] = React.useState(Date.now());

  React.useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const msLeft = expiresAt ? new Date(expiresAt).getTime() - now : 0;
  const expired = expiresAt !== null && msLeft <= 0;

  async function request() {
    setLoading(true);
    setError(null);
    try {
      const res = await post<OtpRequestResult>(`/me/subscriptions/${subscriptionId}/request-otp`);
      setCode(res.code);
      setExpiresAt(res.expiresAt);
      setUsed(res.used);
      setCanRequest(res.used < res.limit);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — ignore
    }
  }

  const whatsappHref = `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent("I need help with my subscription access code.")}`;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <KeyRound className="h-5 w-5 text-primary" />
        <CardTitle className="text-base">Subscription access code</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="leading-relaxed">
          When the {productName ?? "service"} website or app asks for a verification code, request it here and we&apos;ll
          retrieve it for you. Never use this code anywhere except the official {productName ?? "service"} website or app.
        </CardDescription>

        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Open the official {productName ?? "service"} website or app and choose the verification-code option.</li>
          <li>Tap “Get Access Code” here — the code is retrieved in a moment.</li>
          <li>Enter it only on the official {productName ?? "service"} sign-in screen. It expires in 10 minutes.</li>
        </ol>

        {code && !expired ? (
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Your access code</p>
              <p className="font-mono text-4xl font-bold tracking-[0.35em]">{code}</p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Expires in {formatCountdown(msLeft)}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={copyCode}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy code"}
              </Button>
            </div>
            <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              Enter this code only on the official {productName ?? "service"} website or app. SubMate will never ask you
              to enter it anywhere else.
            </p>
          </div>
        ) : null}

        {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}

        {canRequest ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button type="button" onClick={request} disabled={loading} className="w-full sm:w-auto">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {loading ? "Retrieving access code…" : "Get Access Code"}
            </Button>
            <p className="text-xs text-muted-foreground">
              {used} of {status.limit} requests used today
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">You&apos;ve used all {status.limit} access-code requests today.</p>
            <p className="mt-1 text-muted-foreground">For security, requests are limited. Contact us on WhatsApp and we&apos;ll help you sign in.</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <a href={whatsappHref} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4" /> Contact on WhatsApp
              </a>
            </Button>
          </div>
        )}

        <p className="rounded-lg bg-muted/30 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          SubMate is an independent subscription platform and is not affiliated with or endorsed by {productName ?? "the service"}.
        </p>
      </CardContent>
    </Card>
  );
}