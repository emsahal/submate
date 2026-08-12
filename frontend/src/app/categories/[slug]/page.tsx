import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import type { PublicCategory, PublicProduct } from "@/types/shared";
import { ProductCard } from "@/components/product-card";
import { Eyebrow, BlurHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { category } = await api<{ category: PublicCategory }>(`/categories/${slug}`);
    return { title: `${category.name} Subscriptions` };
  } catch {
    return { title: "Category" };
  }
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  let category: PublicCategory;
  let products: PublicProduct[];
  try {
    const data = await api<{ category: PublicCategory; products: { items: PublicProduct[] } }>(`/categories/${slug}`);
    category = data.category;
    products = data.products.items;
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
      <Reveal>
        <Link
          href="/categories"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> All categories
        </Link>
      </Reveal>

      <div className="mt-6 max-w-2xl">
        <Reveal>
          <Eyebrow>Category</Eyebrow>
        </Reveal>
        <BlurHeading text={category.name} className="display-2xl mt-5" as="h1" />
        {category.description ? (
          <Reveal delay={150}>
            <p className="lead-lg mt-5 text-muted-foreground">{category.description}</p>
          </Reveal>
        ) : null}
      </div>

      <div className="mt-12">
        {products.length === 0 ? (
          <p className="text-muted-foreground">No subscriptions in this category yet.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, i) => (
              <Reveal key={product.id} delay={(i % 4) * 60}>
                <ProductCard product={product} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
