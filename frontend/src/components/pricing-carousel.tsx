"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CircleCheck } from "lucide-react";
import type { PublicProduct } from "@/types/shared";
import { cn } from "@/lib/utils";
import { formatPKR } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/brand-logo";

function ServiceIcon({ product }: { product: PublicProduct }) {
  if (product.logoUrl) {
    if (product.logoUrlDark) {
      return (
        <>
          <Image src={product.logoUrl} alt="" width={24} height={24} className="h-6 w-6 object-contain dark:hidden" />
          <Image src={product.logoUrlDark} alt="" width={24} height={24} className="hidden h-6 w-6 object-contain dark:block" />
        </>
      );
    }
    return <Image src={product.logoUrl} alt="" width={24} height={24} className="h-6 w-6 object-contain" />;
  }
  return <BrandLogo slug={product.slug} size={24} className="h-6 w-6" />;
}

/** Monthly (<= 31 day) price for a product, falling back to its cheapest plan. */
function monthlyPrice(product: PublicProduct): number {
  const monthly = product.plans.find((p) => p.durationDays <= 31);
  return monthly?.priceLocal ?? product.minPrice ?? 0;
}

/** Index of the product with the lowest monthly price (highlighted as recommended). */
function recommendedIndex(products: PublicProduct[]): number {
  let best = 0;
  for (let i = 1; i < products.length; i++) {
    if (monthlyPrice(products[i]) < monthlyPrice(products[best])) best = i;
  }
  return best;
}

function PricingCard({ product, recommended }: { product: PublicProduct; recommended: boolean }) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col border bg-card",
        recommended && "border-primary ring ring-primary ring-inset",
      )}
    >
      {recommended && <Badge className="absolute top-0 right-0 rounded-none">Most Popular</Badge>}
      <div className={cn("p-6", recommended && "bg-linear-to-bl from-primary/15")}>
        <div className="mb-5 text-primary">
          <ServiceIcon product={product} />
        </div>
        <div className="flex items-center gap-1">
          <h3 className="font-heading font-medium text-2xl tracking-tight">{product.name}</h3>
        </div>
        <p className="my-2 text-muted-foreground">{product.shortDescription}</p>
      </div>
      <Separator />
      <div className="flex flex-1 flex-col px-6 pt-5 pb-10">
        <p className="mt-4 font-heading font-semibold text-4xl">{formatPKR(monthlyPrice(product))}</p>
        <p className="mt-1 text-muted-foreground text-sm tracking-normal">per month</p>
        <Button asChild className="my-6 w-full" size="lg">
          <Link href={`/subscriptions/${product.slug}`}>Get Started</Link>
        </Button>
        <ul className="mt-4 space-y-2">
          {product.features.slice(0, 5).map((feature) => (
            <li className="flex items-center gap-2" key={feature}>
              <CircleCheck className="size-4 shrink-0 text-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function itemsPerView(width: number): number {
  if (width >= 1024) return 3;
  if (width >= 640) return 2;
  return 1;
}

export function PricingCarousel({ products }: { products: PublicProduct[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  };

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [products.length]);

  const step = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const perView = itemsPerView(el.clientWidth);
    const stepWidth = el.clientWidth / perView;
    el.scrollBy({ left: dir * stepWidth, behavior: "smooth" });
  };

  const best = recommendedIndex(products);

  return (
    <div className="relative mt-12 md:mt-16">
      <div
        ref={trackRef}
        className="flex gap-8 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product, i) => (
          <div
            key={product.id}
            className="min-w-0 grow-0 shrink-0 snap-start basis-full sm:basis-[calc(50%-1rem)] lg:basis-[calc(33.333%-1.333rem)]"
          >
            <PricingCard product={product} recommended={i === best} />
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={!canPrev}
          aria-label="Previous plans"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={!canNext}
          aria-label="Next plans"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
