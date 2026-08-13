"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Link2, Loader2, Megaphone, Save, Unplug } from "lucide-react";
import { get, patch, post } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

type Settings = {
  storeName: string;
  supportEmail: string;
  currency: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  seo: { defaultTitle: string; defaultDescription: string };
  order: { pendingExpiryHours: number; screenshotMaxBytes: number; allowedMimeTypes: string[] };
  notifications: { expiry7d: boolean; expiry3d: boolean; expiry1d: boolean; expired: boolean };
};

const defaults: Settings = {
  storeName: "SubMate",
  supportEmail: "support@submate.tech",
  currency: "PKR",
  maintenanceMode: false,
  maintenanceMessage: "",
  seo: { defaultTitle: "", defaultDescription: "" },
  order: { pendingExpiryHours: 48, screenshotMaxBytes: 6 * 1024 * 1024, allowedMimeTypes: [] },
  notifications: { expiry7d: true, expiry3d: true, expiry1d: true, expired: true },
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [inbox, setInbox] = React.useState<{ connected: boolean; email: string | null; connectedAt: string | null } | null>(null);
  const [inboxBusy, setInboxBusy] = React.useState(false);
  const [broadcastOpen, setBroadcastOpen] = React.useState(false);
  const [broadcastTitle, setBroadcastTitle] = React.useState("");
  const [broadcastBody, setBroadcastBody] = React.useState("");
  const [broadcastLink, setBroadcastLink] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const searchParams = useSearchParams();

  async function load() {
    try {
      const d = await get<{ settings: Record<string, Partial<Settings>> }>("/admin/settings");
      const merged: Settings = { ...defaults };
      for (const [k, v] of Object.entries(d.settings)) {
        const key = k as keyof Settings;
        if (v && typeof v === "object") merged[key] = { ...(merged[key] as object), ...v } as never;
        else merged[key] = v as never;
      }
      setSettings(merged);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  async function loadInbox() {
    try {
      const d = await get<{ connected: boolean; email: string | null; connectedAt: string | null }>("/admin/gmail/status");
      setInbox(d);
    } catch {
      setInbox(null);
    }
  }

  React.useEffect(() => {
    load();
    loadInbox();
    const gmailParam = searchParams.get("gmail");
    if (gmailParam === "connected") {
      toast.success("Inbox connected.");
      loadInbox();
    } else if (gmailParam === "error") {
      toast.error(`Inbox connection failed: ${searchParams.get("reason") ?? "unknown error"}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function connectInbox() {
    setInboxBusy(true);
    try {
      const d = await get<{ url: string }>("/admin/gmail/authorize");
      window.location.href = d.url;
    } catch (err) {
      toast.error(formatError(err));
      setInboxBusy(false);
    }
  }

  async function disconnectInbox() {
    setInboxBusy(true);
    try {
      await post("/admin/gmail/disconnect");
      setInbox({ connected: false, email: null, connectedAt: null });
      toast.success("Inbox disconnected.");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setInboxBusy(false);
    }
  }

  function patchSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await patch("/admin/settings", {
        storeName: settings.storeName,
        supportEmail: settings.supportEmail,
        currency: settings.currency,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        seo: settings.seo,
        order: { ...settings.order, screenshotMaxBytes: Math.min(settings.order.screenshotMaxBytes, 20 * 1024 * 1024) },
        notifications: settings.notifications,
      });
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  async function broadcast() {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setSending(true);
    try {
      const res = await post<{ recipients: number }>("/admin/notifications/broadcast", {
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        link: broadcastLink.trim() || undefined,
      });
      toast.success(`Broadcast sent to ${res.recipients} users.`);
      setBroadcastOpen(false);
      setBroadcastTitle("");
      setBroadcastBody("");
      setBroadcastLink("");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSending(false);
    }
  }

  if (error) return <EmptyState title="Couldn't load settings" description={error} />;
  if (!settings) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Store-wide configuration.</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Store</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store">Store name</Label>
              <Input id="store" value={settings.storeName} onChange={(e) => patchSetting("storeName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support">Support email</Label>
              <Input id="support" type="email" value={settings.supportEmail} onChange={(e) => patchSetting("supportEmail", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={settings.currency} onChange={(e) => patchSetting("currency", e.target.value.toUpperCase())} maxLength={3} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Maintenance mode</p>
                <p className="text-xs text-muted-foreground">Hides the storefront behind a message.</p>
              </div>
              <Switch checked={settings.maintenanceMode} onCheckedChange={(v) => patchSetting("maintenanceMode", v)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance">Maintenance message</Label>
              <Input id="maintenance" value={settings.maintenanceMessage} onChange={(e) => patchSetting("maintenanceMessage", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seot">Default title</Label>
                <Input id="seot" value={settings.seo.defaultTitle} onChange={(e) => patchSetting("seo", { ...settings.seo, defaultTitle: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seod">Default description</Label>
                <Textarea id="seod" value={settings.seo.defaultDescription} onChange={(e) => patchSetting("seo", { ...settings.seo, defaultDescription: e.target.value })} rows={2} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pending">Pending order expiry (hours)</Label>
                <Input id="pending" type="number" value={settings.order.pendingExpiryHours} onChange={(e) => patchSetting("order", { ...settings.order, pendingExpiryHours: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bytes">Max screenshot size (MB)</Label>
                <Input id="bytes" type="number" value={Math.round(settings.order.screenshotMaxBytes / 1024 / 1024)} onChange={(e) => patchSetting("order", { ...settings.order, screenshotMaxBytes: Number(e.target.value) * 1024 * 1024 })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  ["expiry7d", "7 days before expiry"],
                  ["expiry3d", "3 days before expiry"],
                  ["expiry1d", "1 day before expiry"],
                  ["expired", "On expiry"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-md border p-3">
                  <p className="text-sm font-medium">{label}</p>
                  <Switch checked={settings.notifications[key]} onCheckedChange={(v) => patchSetting("notifications", { ...settings.notifications, [key]: v })} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subscription access codes</CardTitle>
              <CardDescription>
                Connect the inbox that receives verification codes for subscription sign-in. Customers request the access
                code from their subscription page (limited to 3 per day) and enter it on the official service's website
                or app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {inbox === null ? (
                <Skeleton className="h-20" />
              ) : inbox.connected ? (
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Connected</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
                      <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
                    </span>
                  </div>
                  {inbox.connectedAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">Connected {new Date(inbox.connectedAt).toLocaleString()}</p>
                  ) : null}
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={disconnectInbox} disabled={inboxBusy}>
                    {inboxBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
                    Disconnect
                  </Button>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">Not connected yet.</p>
                  <Button type="button" className="mt-3" onClick={connectInbox} disabled={inboxBusy}>
                    {inboxBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Connect inbox
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Broadcast</CardTitle>
              <CardDescription>Send an in-app notification to every user.</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Megaphone className="h-4 w-4" /> Send broadcast
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Send broadcast</DialogTitle>
                    <DialogDescription>Send an in-app notification to every user. Provide a short title and message.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="btitle">Title</Label>
                      <Input id="btitle" value={broadcastTitle} onChange={(e) => setBroadcastTitle(e.target.value)} placeholder="New offers are live" maxLength={160} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bbody">Message</Label>
                      <Textarea id="bbody" value={broadcastBody} onChange={(e) => setBroadcastBody(e.target.value)} placeholder="Our Summer sale is here!" rows={3} maxLength={1000} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="blink">Link (optional)</Label>
                      <Input id="blink" value={broadcastLink} onChange={(e) => setBroadcastLink(e.target.value)} placeholder="/subscriptions" maxLength={500} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={broadcast} disabled={sending || !broadcastTitle.trim() || !broadcastBody.trim()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                      {sending ? "Sending…" : "Send broadcast"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
