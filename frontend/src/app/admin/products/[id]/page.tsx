"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { del, get, patch, post } from "@/lib/api";
import { formatPKR } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

type ProductRow = {
  id: number;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: number | null;
  imageUrl: string | null;
  logoUrl: string | null;
  logoUrlDark: string | null;
  features: string[];
  providerName: string | null;
  isVerified: boolean;
  eligibilityNote: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  status: string;
  isFeatured: boolean;
  sortOrder: number;
};

type PlanRow = {
  id: number;
  name: string;
  durationDays: number;
  priceLocal: number;
  priceUsd: number;
  currency: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
};

export default function AdminProductEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = React.useState<ProductRow | null>(null);
  const [plans, setPlans] = React.useState<PlanRow[]>([]);
  const [cats, setCats] = React.useState<{ id: number; name: string }[]>([]);
  const [features, setFeatures] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [planDraft, setPlanDraft] = React.useState({ name: "", durationDays: 30, priceLocal: 1000, description: "" });
  const [planBusy, setPlanBusy] = React.useState(false);

  async function load() {
    try {
      const [p, c] = await Promise.all([get<{ product: ProductRow; plans: PlanRow[] }>(`/admin/products/${params.id}`), get<{ items: { id: number; name: string }[] }>("/admin/categories")]);
      setForm(p.product);
      setPlans(p.plans);
      setCats(c.items);
      setFeatures(p.product.features.join("\n"));
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  function set<K extends keyof ProductRow>(key: K, value: ProductRow[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    try {
      await patch(`/admin/products/${params.id}`, {
        name: form.name,
        categoryId: form.categoryId,
        shortDescription: form.shortDescription,
        description: form.description,
        imageUrl: form.imageUrl ?? "",
        logoUrl: form.logoUrl ?? "",
        logoUrlDark: form.logoUrlDark ?? "",
        features: features.split("\n").map((f) => f.trim()).filter(Boolean),
        providerName: form.providerName ?? "",
        isVerified: form.isVerified,
        eligibilityNote: form.eligibilityNote ?? "",
        seoTitle: form.seoTitle ?? "",
        seoDescription: form.seoDescription ?? "",
        status: form.status as never,
        isFeatured: form.isFeatured,
        sortOrder: form.sortOrder,
      });
      toast.success("Product saved.");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  async function addPlan() {
    if (!planDraft.name.trim()) return;
    setPlanBusy(true);
    try {
      await post(`/admin/products/${params.id}/plans`, {
        name: planDraft.name.trim(),
        durationDays: Number(planDraft.durationDays),
        priceLocal: Number(planDraft.priceLocal),
        description: planDraft.description || undefined,
      });
      toast.success("Plan added.");
      setPlanDraft({ name: "", durationDays: 30, priceLocal: 1000, description: "" });
      await load();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setPlanBusy(false);
    }
  }

  async function togglePlan(plan: PlanRow) {
    try {
      await patch(`/admin/plans/${plan.id}`, { isActive: !plan.isActive });
      await load();
    } catch (err) {
      toast.error(formatError(err));
    }
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/products">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        </Button>
        <EmptyState title="Product not found" description={error} />
      </div>
    );
  }
  if (!form) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4" /> Back to products
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-2xl font-bold">{form.name}</h1>
            <Badge variant={form.status === "ACTIVE" ? "success" : form.status === "DRAFT" ? "secondary" : "warning"}>{form.status}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">/subscriptions/{form.slug}</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={form.slug} disabled />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cat">Category</Label>
                <Select value={form.categoryId != null ? String(form.categoryId) : ""} onValueChange={(v) => set("categoryId", v ? Number(v) : null)}>
                  <SelectTrigger id="cat">
                    <SelectValue />
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
                <Label htmlFor="status">Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="short">Short description</Label>
              <Input id="short" value={form.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Full description</Label>
              <Textarea id="desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={6} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">Provider name</Label>
              <Input id="provider" value={form.providerName ?? ""} onChange={(e) => set("providerName", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eligibility">Eligibility note</Label>
              <Textarea id="eligibility" value={form.eligibilityNote ?? ""} onChange={(e) => set("eligibilityNote", e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">Features (one per line)</Label>
              <Textarea id="features" value={features} onChange={(e) => setFeatures(e.target.value)} rows={5} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Images & SEO</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="image">Image URL</Label>
                <Input id="image" value={form.imageUrl ?? ""} onChange={(e) => set("imageUrl", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo">Logo URL (light)</Label>
                <Input id="logo" value={form.logoUrl ?? ""} onChange={(e) => set("logoUrl", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logodark">Logo URL (dark / white)</Label>
                <Input id="logodark" value={form.logoUrlDark ?? ""} onChange={(e) => set("logoUrlDark", e.target.value)} />
                <p className="text-xs text-muted-foreground">Shown in dark mode. Upload a white version of the logo to the bucket and paste its URL here.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seot">SEO title</Label>
                <Input id="seot" value={form.seoTitle ?? ""} onChange={(e) => set("seoTitle", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seod">SEO description</Label>
                <Textarea id="seod" value={form.seoDescription ?? ""} onChange={(e) => set("seoDescription", e.target.value)} rows={2} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Verified</p>
                  <p className="text-xs text-muted-foreground">Shown with a verified badge on the storefront.</p>
                </div>
                <Switch checked={form.isVerified} onCheckedChange={(v) => set("isVerified", v)} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Featured</p>
                  <p className="text-xs text-muted-foreground">Featured on the home page.</p>
                </div>
                <Switch checked={form.isFeatured} onCheckedChange={(v) => set("isFeatured", v)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sort">Sort order</Label>
                <Input id="sort" type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plans</CardTitle>
              <CardDescription>Duration and price options for this product.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {plans.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plans yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {plans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between gap-3 py-2">
                      <div>
                        <p className="text-sm font-medium">
                          {plan.name} · {formatPKR(plan.priceLocal)} / {plan.durationDays}d
                        </p>
                        <p className="text-xs text-muted-foreground">{plan.description ?? "—"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={plan.isActive ? "success" : "secondary"}>{plan.isActive ? "Active" : "Inactive"}</Badge>
                        <Button variant="outline" size="sm" onClick={() => togglePlan(plan)}>
                          {plan.isActive ? "Disable" : "Enable"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid gap-3 border-t pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="planname">Name</Label>
                  <Input id="planname" value={planDraft.name} onChange={(e) => setPlanDraft({ ...planDraft, name: e.target.value })} placeholder="Monthly" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plancur">Price (PKR)</Label>
                  <Input id="plancur" type="number" value={planDraft.priceLocal} onChange={(e) => setPlanDraft({ ...planDraft, priceLocal: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="plandur">Duration (days)</Label>
                  <Input id="plandur" type="number" value={planDraft.durationDays} onChange={(e) => setPlanDraft({ ...planDraft, durationDays: Number(e.target.value) })} />
                </div>
                <div className="flex items-end">
                  <Button onClick={addPlan} disabled={planBusy || !planDraft.name.trim()} className="w-full">
                    {planBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add plan
                  </Button>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="plandesc">Description</Label>
                  <Input id="plandesc" value={planDraft.description} onChange={(e) => setPlanDraft({ ...planDraft, description: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
