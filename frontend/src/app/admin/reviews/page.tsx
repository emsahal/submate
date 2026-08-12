"use client";

import * as React from "react";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { get, post } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReviewStatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";

type ReviewRow = {
  id: number;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  productName: string;
  userName: string;
};

function Stars({ rating }: { rating: number }) {
  return <span className="text-sm text-warning">{"★".repeat(rating)}</span>;
}

export default function AdminReviewsPage() {
  const [items, setItems] = React.useState<ReviewRow[] | null>(null);
  const [status, setStatus] = React.useState("PENDING");
  const [error, setError] = React.useState<string | null>(null);

  async function load(s: string) {
    try {
      const d = await get<{ items: ReviewRow[] }>(`/admin/reviews${s !== "all" ? `?status=${s}` : ""}`);
      setItems(d.items);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function moderate(id: number, next: "PUBLISHED" | "HIDDEN") {
    try {
      await post(`/admin/reviews/${id}/moderate`, { status: next });
      toast.success("Review updated.");
      await load(status);
    } catch (err) {
      toast.error(formatError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Reviews</h1>
          <p className="text-muted-foreground">Moderate customer reviews before they go live.</p>
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
            <SelectItem value="HIDDEN">Hidden</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <EmptyState title="Couldn't load reviews" description={error} />
      ) : !items ? (
        <Skeleton className="h-96" />
      ) : items.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="No reviews" description="No reviews match this filter." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map((r) => (
                <div key={r.id} className="flex flex-wrap items-start justify-between gap-4 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Stars rating={r.rating} />
                      <p className="text-sm font-medium">{r.productName}</p>
                      <ReviewStatusBadge status={r.status as never} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.userName} · {formatDateTime(r.createdAt)}
                    </p>
                    {r.comment ? <p className="mt-1 text-sm text-muted-foreground">{r.comment}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    {r.status !== "PUBLISHED" ? (
                      <Button variant="success" size="sm" onClick={() => moderate(r.id, "PUBLISHED")}>
                        Publish
                      </Button>
                    ) : null}
                    {r.status !== "HIDDEN" ? (
                      <Button variant="outline" size="sm" onClick={() => moderate(r.id, "HIDDEN")}>
                        Hide
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
