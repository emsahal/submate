"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { del, get, post } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

type Category = { id: number; name: string; slug: string };
type ProductRow = {
  id: number;
  name: string;
  slug: string;
  categoryId: number | null;
  status: string;
  isFeatured: boolean;
  providerName: string | null;
  updatedAt: string;
};

function slugify(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}

export default function AdminProductsPage() {
  const [items, setItems] = React.useState<ProductRow[] | null>(null);
  const [cats, setCats] = React.useState<Category[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const [name, setName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [status, setStatus] = React.useState("DRAFT");

  async function load() {
    try {
      const [p, c] = await Promise.all([get<{ items: ProductRow[] }>("/admin/products"), get<{ items: Category[] }>("/admin/categories")]);
      setItems(p.items);
      setCats(c.items);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function createProduct() {
    if (!name.trim() || !categoryId) return;
    setBusy(true);
    try {
      await post("/admin/products", {
        name: name.trim(),
        slug: slugify(name),
        categoryId: Number(categoryId),
        status: status as never,
        shortDescription: "",
        description: "",
        features: [],
      });
      toast.success("Product created.");
      setOpen(false);
      setName("");
      setCategoryId("");
      setStatus("DRAFT");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeProduct(id: number) {
    if (!confirm("Delete this product? Plans will be removed too.")) return;
    try {
      await del(`/admin/products/${id}`);
      toast.success("Product deleted.");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Products</h1>
          <p className="text-muted-foreground">Catalog items and their plans.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> New product
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New product</DialogTitle>
              <DialogDescription>Create the product draft, then add plans from its page.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pname">Name</Label>
                <Input id="pname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Netflix" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pcat">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="pcat">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {cats.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pstatus">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="pstatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createProduct} disabled={busy || !name.trim() || !categoryId}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <EmptyState title="Couldn't load products" description={error} />
      ) : !items ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No products" description="Create your first product to get started." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Provider</th>
                    <th className="px-4 py-3 font-medium">Featured</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/admin/products/${p.id}`} className="font-medium text-primary hover:underline">
                          {p.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{p.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.status === "ACTIVE" ? "success" : p.status === "DRAFT" ? "secondary" : "warning"}>{p.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.providerName ?? "—"}</td>
                      <td className="px-4 py-3">{p.isFeatured ? "Yes" : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/admin/products/${p.id}`}>
                              <Pencil className="h-4 w-4" /> Edit
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => removeProduct(p.id)}>
                            <Trash2 className="h-4 w-4" /> Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
