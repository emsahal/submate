"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { del, get } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

type PostRow = { id: number; title: string; slug: string; status: string; category: string | null; publishedAt: string | null };

export default function AdminBlogPage() {
  const [items, setItems] = React.useState<PostRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    try {
      const d = await get<{ items: PostRow[] }>("/admin/blog");
      setItems(d.items);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function remove(id: number) {
    if (!confirm("Delete this blog post?")) return;
    try {
      await del(`/admin/blog/${id}`);
      toast.success("Post deleted.");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Blog</h1>
          <p className="text-muted-foreground">Write and manage articles.</p>
        </div>
        <Button asChild>
          <Link href="/admin/blog/new">
            <Plus className="h-4 w-4" /> New post
          </Link>
        </Button>
      </div>

      {error ? (
        <EmptyState title="Couldn't load posts" description={error} />
      ) : !items ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<FileText className="h-8 w-8" />} title="No posts" description="Write your first article." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">
                      <Link href={`/admin/blog/${p.id}`} className="hover:text-primary hover:underline">
                        {p.title}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      /blog/{p.slug}
                      {p.category ? ` · ${p.category}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.status === "PUBLISHED" ? "success" : p.status === "DRAFT" ? "secondary" : "warning"}>{p.status}</Badge>
                    <Button asChild variant="ghost" size="sm">
                      <Link href={`/admin/blog/${p.id}`}>Edit</Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => remove(p.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
