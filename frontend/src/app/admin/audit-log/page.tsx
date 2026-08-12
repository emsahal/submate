"use client";

import * as React from "react";
import { ScrollText } from "lucide-react";
import { get } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

type AuditRow = {
  id: number;
  adminId: string | null;
  actorRole: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
};

export default function AdminAuditLogPage() {
  const [items, setItems] = React.useState<AuditRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    get<{ items: AuditRow[] }>("/admin/audit-logs")
      .then((d) => setItems(d.items))
      .catch((err) => setError(formatError(err)));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Audit log</h1>
        <p className="text-muted-foreground">Immutable trail of privileged actions.</p>
      </div>

      {error ? (
        <EmptyState title="Couldn't load audit log" description={error} />
      ) : !items ? (
        <Skeleton className="h-96" />
      ) : items.length === 0 ? (
        <EmptyState icon={<ScrollText className="h-8 w-8" />} title="No entries" description="Actions will appear here." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map((a) => (
                <div key={a.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold">{a.action}</span>
                    <span className="text-xs text-muted-foreground">
                      {a.actorRole} · {a.adminId ?? "system"}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {a.targetType ?? "—"}
                    {a.targetId ? ` #${a.targetId}` : ""}
                    {a.ipAddress ? ` · ${a.ipAddress}` : ""}
                  </p>
                  {a.meta && Object.keys(a.meta).length > 0 ? (
                    <pre className="mt-2 overflow-x-auto rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground">{JSON.stringify(a.meta, null, 2)}</pre>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
