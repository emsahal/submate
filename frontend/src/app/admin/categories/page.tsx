"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { del, get, post } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

type Row = { id: number; name: string; slug: string; description: string | null; sortOrder: number; isActive: boolean };

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export default function AdminCategoriesPage() {
  const [items, setItems] = React.useState<Row[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");

  async function load() {
    try {
      const d = await get<{ items: Row[] }>("/admin/categories");
      setItems(d.items);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await post("/admin/categories", { name: name.trim(), slug: slugify(name) });
      toast.success("Category created.");
      setOpen(false);
      setName("");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this category?")) return;
    try {
      await del(`/admin/categories/${id}`);
      toast.success("Category deleted.");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Group products into browsable sections.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> New category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New category</DialogTitle>
              <DialogDescription>The slug is generated automatically.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="cname">Name</Label>
              <Input id="cname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Streaming" />
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={busy || !name.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <EmptyState title="Couldn't load categories" description={error} />
      ) : !items ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No categories" description="Create your first category." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      /categories/{c.slug} · sort {c.sortOrder}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!c.isActive ? <span className="text-xs text-muted-foreground">inactive</span> : null}
                    <Button variant="ghost" size="sm" onClick={() => remove(c.id)}>
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
