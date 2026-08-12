"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCheck, Bell, BellOff } from "lucide-react";
import type { NotificationItem } from "@/types/shared";
import { get, post } from "@/lib/api";
import { relativeTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const [items, setItems] = React.useState<NotificationItem[] | null>(null);
  const [unread, setUnread] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    try {
      const data = await get<{ items: NotificationItem[]; unread: number }>("/me/notifications?limit=100");
      setItems(data.items);
      setUnread(data.unread);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function markAll() {
    await post("/me/notifications/read-all");
    setUnread(0);
    setItems((prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? []);
  }

  async function markOne(id: number) {
    await post(`/me/notifications/${id}/read`);
    setUnread((u) => Math.max(0, u - 1));
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, readAt: n.readAt ?? new Date().toISOString() } : n)) ?? []);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 ? (
          <Button variant="outline" size="sm" onClick={markAll}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        ) : null}
      </div>

      {error ? (
        <EmptyState title="Couldn't load notifications" description={error} />
      ) : !items ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<BellOff className="h-8 w-8" />} title="No notifications" description="We'll notify you about orders, payments and expiry here." />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const content = (
              <div className="flex w-full items-start gap-3 p-4">
                <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.readAt ? "bg-transparent" : "bg-primary")} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className={cn("text-sm", item.readAt ? "text-muted-foreground" : "font-semibold")}>{item.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(item.createdAt)}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                </div>
              </div>
            );
            return item.readAt ? (
              <Card key={item.id} className="opacity-70">
                <CardContent className="p-0">{content}</CardContent>
              </Card>
            ) : (
              <Card key={item.id} className="cursor-pointer border-primary/40 transition-colors hover:border-primary" onClick={() => markOne(item.id)}>
                <CardContent className="p-0">{content}</CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
