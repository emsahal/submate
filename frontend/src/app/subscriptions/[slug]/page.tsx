import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Verified } from "lucide-react";
import { fetchProduct } from "@/lib/site-data";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanPicker } from "@/components/plan-picker";
import { ProductReviews } from "@/components/product-reviews";
import { BrandLogo } from "@/components/brand-logo";
import { Eyebrow, BlurHeading } from "@/components/section-heading";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { product } = await fetchProduct(slug);
    return {
      title: `${product.name} Subscription in Pakistan`,
      description: product.shortDescription,
    };
  } catch {
    return { title: "Subscription" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  let data;
  try {
    data = await fetchProduct(slug);
  } catch {
    notFound();
  }

  const { product, reviews, reviewSummary } = data;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    image: product.imageUrl ?? product.logoUrl ?? undefined,
    brand: product.providerName ? { "@type": "Brand", name: product.providerName } : undefined,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "PKR",
      lowPrice: product.minPrice,
      highPrice: product.maxPrice,
      offerCount: product.plans.length,
      offers: product.plans.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: plan.priceLocal,
        priceCurrency: plan.currency || "PKR",
      })),
    },
    aggregateRating:
      reviewSummary.count > 0
        ? { "@type": "AggregateRating", ratingValue: reviewSummary.average, reviewCount: reviewSummary.count }
        : undefined,
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/subscriptions"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> All subscriptions
      </Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_400px]">
        {/* Left: product info */}
        <div className="space-y-8">
          <div className="flex items-start gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted">
              {product.logoUrl ? (
                product.logoUrlDark ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.logoUrl} alt={product.name} className="h-full w-full object-contain p-2 dark:hidden" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={product.logoUrlDark} alt={`${product.name} (white)`} className="hidden h-full w-full object-contain p-2 dark:block" />
                  </>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.logoUrl} alt={product.name} className="h-full w-full object-contain p-2" />
                )
              ) : (
                <BrandLogo slug={product.slug} size={48} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Eyebrow>Subscription</Eyebrow>
              <BlurHeading text={product.name} className="display-xl mt-4" as="h1" />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {product.providerName ? <span>{product.providerName}</span> : null}
                {product.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <Verified className="h-4 w-4" /> Verified
                  </span>
                ) : null}
                {reviewSummary.count > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    {reviewSummary.average.toFixed(1)} ({reviewSummary.count} reviews)
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {product.eligibilityNote ? (
            <div className="card-bubble rounded-2xl border border-info/30 bg-info/5 p-5 text-sm text-info-foreground">
              <p className="font-medium">Eligibility note</p>
              <p className="mt-1 text-foreground/80">{product.eligibilityNote}</p>
            </div>
          ) : null}

          <div>
            <h2 className="mb-2 font-heading text-xl font-semibold">About this subscription</h2>
            <p className="text-foreground/85">{product.description}</p>
          </div>

          {product.features.length > 0 ? (
            <div>
              <h2 className="mb-3 font-heading text-xl font-semibold">What's included</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                        <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
                      </svg>
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ProductReviews productId={product.id} reviews={reviews} />
        </div>

        {/* Right: pricing */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card className="card-bubble card-lift">
            <CardHeader>
              <CardTitle>Choose your plan</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanPicker productId={product.id} slug={product.slug} plans={product.plans} />
            </CardContent>
          </Card>
          <div className="card-bubble mt-4 rounded-2xl border border-border p-5 text-sm text-muted-foreground">
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant="outline">PKR payments</Badge>
              <Badge variant="outline">Admin verified</Badge>
              <Badge variant="outline">Encrypted delivery</Badge>
            </div>
            <p>
              Only subscribe where the provider and the law allow. SubMate is a marketplace, not an official reseller of
              any brand.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
