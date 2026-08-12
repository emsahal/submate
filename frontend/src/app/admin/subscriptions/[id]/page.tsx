"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Loader2, Play, Pause, RefreshCw, XCircle } from "lucide-react";
import type { SubscriptionDetail } from "@/types/shared";
import { get, post } from "@/lib/api";
import { formatPKR, formatDate } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { SubscriptionStatusBadge, ToneBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

type Detail = { subscription: SubscriptionDetail; userId: string };

export default function AdminSubscriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = React.useState<Detail | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const [credType, setCredType] = React.useState("PROVIDER_LINK");
  const [payload, setPayload] = React.useState("");
  const [notes, setNotes] = React.useState("");

  async function load() {
    try {
      const d = await get<Detail>(`/admin/subscriptions/${params.id}`);
      setDetail(d);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function act(action: "RENEW" | "SUSPEND" | "ACTIVATE" | "CANCEL") {
    setBusy(`act-${action}`);
    try {
      await post(`/admin/subscriptions/${params.id}/action`, { action, note: notes || undefined });
      toast.success("Subscription updated.");
      setNotes("");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setBusy(null);
    }
  }

  async function saveCredential() {
    if (!payload.trim()) return;
    setBusy("cred");
    try {
      await post(`/admin/subscriptions/${params.id}/credential`, { type: credType as never, payload: payload.trim(), notes: notes || undefined });
      toast.success("Access credential saved (encrypted).");
      setPayload("");
      setNotes("");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/subscriptions">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <EmptyState title="Subscription not found" description={error} />
      </div>
    );
  }
  if (!detail) return <Skeleton className="h-96" />;

  const s = detail.subscription;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/admin/subscriptions">
            <ArrowLeft className="h-4 w-4" /> Back to subscriptions
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-bold">{s.productName}</h1>
          <SubscriptionStatusBadge status={s.status} />
          {s.hasCredential ? <ToneBadge tone="success" label="Credential set" /> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {s.subscriptionNumber} · {s.planName} · {s.remainingDays} days left
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <dl className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Period</dt>
                  <dd>
                    {formatDate(s.startDate)} → {formatDate(s.expiryDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{s.status}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Renewal</dt>
                  <dd>{s.renewalStatus.replace("_", " ").toLowerCase()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{s.createdAt.slice(0, 10)}</dd>
                </div>
              </dl>
              {s.notes ? (
                <p className="mt-3 rounded-md bg-muted/40 p-3 text-xs">{s.notes}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Access credential</CardTitle>
              <CardDescription>Encrypted before storage. The customer can reveal it from their dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {s.accessMeta && Object.keys(s.accessMeta).length > 0 ? (
                <div className="rounded-md bg-muted/40 p-3 text-xs">
                  {Object.entries(s.accessMeta).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="text-right">{v}</span>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="credType">Type</Label>
                <Select value={credType} onValueChange={setCredType}>
                  <SelectTrigger id="credType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROVIDER_LINK">Provider link</SelectItem>
                    <SelectItem value="LICENSE_KEY">License key</SelectItem>
                    <SelectItem value="REDEEM_CODE">Redeem code</SelectItem>
                    <SelectItem value="ACCESS_URL">Access URL</SelectItem>
                    <SelectItem value="BULK_ACCESS">Bulk access</SelectItem>
                    <SelectItem value="GENERIC">Generic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payload">Secret payload</Label>
                <Textarea id="payload" value={payload} onChange={(e) => setPayload(e.target.value)} rows={3} placeholder="The actual link / key / code delivered to the customer." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="credNotes">Notes</Label>
                <Input id="credNotes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional admin note" />
              </div>
              <Button onClick={saveCredential} disabled={busy !== null || !payload.trim()} className="w-full">
                {busy === "cred" ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Save credential
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
              <CardDescription>Manage the subscription lifecycle.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Input id="note" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason recorded in the audit log" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => act("RENEW")} disabled={busy !== null || s.status === "SUSPENDED" || s.status === "CANCELLED"} variant="outline" className="w-full">
                  {busy === "act-RENEW" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Renew
                </Button>
                <Button onClick={() => act("ACTIVATE")} disabled={busy !== null || s.status === "ACTIVE"} variant="outline" className="w-full">
                  {busy === "act-ACTIVATE" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  Activate
                </Button>
                <Button onClick={() => act("SUSPEND")} disabled={busy !== null || s.status === "SUSPENDED" || s.status === "CANCELLED"} variant="outline" className="w-full">
                  {busy === "act-SUSPEND" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                  Suspend
                </Button>
                <Button onClick={() => act("CANCEL")} disabled={busy !== null || s.status === "CANCELLED"} variant="destructive" className="w-full">
                  {busy === "act-CANCEL" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <Link href={`/admin/users?search=${detail.userId}`} className="text-primary hover:underline">
                {detail.userId}
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
