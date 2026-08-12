"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { PublicCategory, PublicProduct } from "@/types/shared";
import { fetchCategories, fetchProducts } from "@/lib/site-data";
import { formatError } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";

export default function SubscriptionsPage() {
  return (
    <React.Suspense fallback={null}>
      <SubscriptionsPageContent />
    </React.Suspense>
  );
}

function SubscriptionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category") ?? "";
  const sortParam = searchParams.get("sort") ?? "newest";

  const [categories, setCategories] = React.useState<PublicCategory[]>([]);
  const [items, setItems] = React.useState<PublicProduct[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [initialLoaded, setInitialLoaded] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState(searchParams.get("q") ?? "");

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [products, cats] = await Promise.all([
          fetchProducts({ category: categoryParam || undefined, sort: sortParam as never, search: search || undefined, limit: 48 }),
          fetchCategories(),
        ]);
        if (cancelled) return;
        setItems(products.items);
        setCategories(cats);
      } catch (err) {
        if (!cancelled) setError(formatError(err));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setInitialLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [categoryParam, sortParam, search]);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.replace(`/subscriptions?${params.toString()}`);
  }

  return (
    <div className="mx-auto max-w-7xl px-26 py-10 sm:py-14">
      {loading && !initialLoaded ? (
        <div className="flex min-h-[55vh] flex-col items-center justify-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <div className="text-center">
            <p className="font-heading text-sm font-semibold text-foreground">Loading subscriptions…</p>
            <p className="mt-1 text-xs text-muted-foreground">Fetching the latest plans for you.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="relative mb-8 overflow-hidden rounded-3xl border border-border bg-card px-26 py-10 sm:px-26">
        <div className="pointer-events-none absolute inset-0 bg-grid text-primary/30 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 -bottom-24 h-48 w-48 rounded-full bg-teal-200/25 blur-3xl" />
        <div className="relative max-w-2xl">
          <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" /> The catalog
          </Badge>
          <h1 className="display-2xl mt-4">Subscriptions in PKR</h1>
          <p className="lead-lg mt-4 max-w-xl text-muted-foreground">
            Browse eligible plans and pay the way you already pay — JazzCash, Easypaisa or bank transfer.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subscriptions…"
            className="pl-9"
            aria-label="Search subscriptions"
          />
        </div>
        <div className="flex gap-3">
          <Select value={categoryParam} onValueChange={(v) => updateParam("category", v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.slug} value={c.slug}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortParam} onValueChange={(v) => updateParam("sort", v)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="popular">Popular</SelectItem>
              <SelectItem value="price_asc">Price: low to high</SelectItem>
              <SelectItem value="price_desc">Price: high to low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? (
        <EmptyState title="Couldn't load subscriptions" description={error} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No subscriptions found"
          description="Try a different search or category."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                router.replace("/subscriptions");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}
