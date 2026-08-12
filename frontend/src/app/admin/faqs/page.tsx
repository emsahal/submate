"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { del, get, post } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";

type FaqRow = { id: number; question: string; answer: string; category: string | null; isActive: boolean; sortOrder: number };

export default function AdminFaqsPage() {
  const [items, setItems] = React.useState<FaqRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [a, setA] = React.useState("");

  async function load() {
    try {
      const d = await get<{ items: FaqRow[] }>("/admin/faqs");
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
    if (!q.trim() || !a.trim()) return;
    setBusy(true);
    try {
      await post("/admin/faqs", { question: q.trim(), answer: a.trim() });
      toast.success("FAQ created.");
      setOpen(false);
      setQ("");
      setA("");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this FAQ?")) return;
    try {
      await del(`/admin/faqs/${id}`);
      toast.success("FAQ deleted.");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">FAQs</h1>
          <p className="text-muted-foreground">Questions shown on the public FAQ page.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> New FAQ
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New FAQ</DialogTitle>
              <DialogDescription>Add a question and its answer.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fq">Question</Label>
                <Input id="fq" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fa">Answer</Label>
                <Textarea id="fa" value={a} onChange={(e) => setA(e.target.value)} rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={busy || !q.trim() || !a.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <EmptyState title="Couldn't load FAQs" description={error} />
      ) : !items ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No FAQs" description="Add your first FAQ." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map((f) => (
                <div key={f.id} className="flex items-start justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{f.question}</p>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{f.answer}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(f.id)}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
