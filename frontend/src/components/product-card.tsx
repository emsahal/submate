import Link from "next/link";
import { ArrowRight, BadgeCheck, Star } from "lucide-react";
import type { PublicProduct } from "@/types/shared";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandLogo } from "@/components/brand-logo";
import { formatPKR } from "@/lib/format";

export function ProductCard({ product }: { product: PublicProduct }) {
  const avg = product.reviewSummary?.average ?? 0;
  const hasPlans = product.plans.length > 0;
  const planCount = product.plans.length;

  return (
    <Link href={`/subscriptions/${product.slug}`} className="group block h-full focus-visible:outline-none">
      <article className="card-bubble card-lift flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
        {/* Cover */}
        <div className="relative flex h-36 shrink-0 items-center justify-center overflow-hidden border-b border-border bg-muted/50">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          ) : product.logoUrl ? (
            product.logoUrlDark ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.logoUrl} alt={product.name} className="h-14 w-14 object-contain dark:hidden" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.logoUrlDark} alt={`${product.name} (white)`} className="hidden h-14 w-14 object-contain dark:block" />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.logoUrl} alt={product.name} className="h-14 w-14 object-contain" />
            )
          ) : (
            <BrandLogo slug={product.slug} size={56} />
          )}
          {product.isVerified ? (
            <Badge variant="success" className="absolute left-3 top-3 gap-1 rounded-md px-2 py-0.5 text-[11px]">
              <BadgeCheck className="h-3 w-3" /> Verified
            </Badge>
          ) : null}
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-heading text-lg font-bold tracking-tight">{product.name}</h3>
              {product.providerName ? (
                <p className="mt-0.5 text-sm text-muted-foreground">{product.providerName}</p>
              ) : null}
            </div>
            {product.logoUrl ? (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={product.logoUrl} alt={product.name} className="h-full w-full object-contain p-1" />
              </div>
            ) : null}
          </div>

          <p className="mt-3 line-clamp-2 text-[15px] leading-relaxed text-muted-foreground">
            {product.shortDescription || product.description}
          </p>

          <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
            {product.category?.name ? <span>{product.category.name}</span> : null}
            {planCount > 0 ? (
              <>
                {product.category?.name ? <span className="text-border">·</span> : null}
                <span>
                  {planCount} {planCount === 1 ? "plan" : "plans"}
                </span>
              </>
            ) : null}
            {avg > 0 ? (
              <>
                <span className="text-border">·</span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {avg.toFixed(1)}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
          <div className="min-w-0">
            {hasPlans ? (
              <>
                <span className="font-heading text-2xl font-bold tracking-tight">{formatPKR(product.minPrice)}</span>
                {product.maxPrice > product.minPrice ? (
                  <span className="text-sm text-muted-foreground"> – {formatPKR(product.maxPrice)}</span>
                ) : null}
                <p className="mt-0.5 text-[13px] text-muted-foreground">starting per period</p>
              </>
            ) : (
              <span className="text-base font-medium text-muted-foreground">Contact for pricing</span>
            )}
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity group-hover:opacity-85">
            View plans
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  );
}

/** Skeleton that mirrors the ProductCard layout so grids don't jump while data loads. */
export function ProductCardSkeleton() {
  return (
    <article className="card-bubble card-lift flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative flex h-36 shrink-0 items-center justify-center overflow-hidden border-b border-border bg-muted/50">
        <Skeleton className="h-14 w-14 rounded-md" />
        <Skeleton className="absolute left-3 top-3 h-5 w-16 rounded-md" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="mt-2 h-3.5 w-1/3" />
          </div>
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
        </div>
        <Skeleton className="mt-4 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-4 h-3.5 w-1/2" />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-4">
        <div>
          <Skeleton className="h-6 w-20" />
          <Skeleton className="mt-1.5 h-3 w-24" />
        </div>
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>
    </article>
  );
}
