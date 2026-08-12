import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicCategory } from "@/types/shared";
import { fetchCategories } from "@/lib/site-data";
import { EmptyState } from "@/components/empty-state";
import { Eyebrow, BlurHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse digital subscriptions by category on Subly.",
};

export default async function CategoriesPage() {
  let categories: PublicCategory[] = [];
  try {
    categories = await fetchCategories();
  } catch {
    categories = [];
  }

  if (categories.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-6">
        <EmptyState title="No categories yet" description="Check back soon for new categories." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20">
      <div className="max-w-2xl">
        <Reveal>
          <Eyebrow>Browse by category</Eyebrow>
        </Reveal>
        <BlurHeading
          text="Explore subscriptions by what you need"
          className="display-2xl mt-5"
          as="h1"
        />
        <Reveal delay={150}>
          <p className="lead-lg mt-5 max-w-xl text-muted-foreground">
            From streaming and music to design and productivity — every plan is verified, priced in PKR and ready to
            activate.
          </p>
        </Reveal>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category, i) => (
          <Reveal key={category.slug} delay={(i % 3) * 80}>
            <Link
              href={`/categories/${category.slug}`}
              className="card-bubble card-lift group flex h-full flex-col rounded-2xl border border-border bg-card p-7"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted font-heading text-lg font-bold text-primary">
                  {category.name.slice(0, 1)}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-all duration-300 group-hover:border-primary/40 group-hover:text-primary">
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </div>

              <h2 className="mt-6 font-heading text-xl font-bold tracking-tight">{category.name}</h2>
              {category.description ? (
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted-foreground">{category.description}</p>
              ) : null}

              <div className="mt-6 border-t border-border pt-5">
                <span className="text-sm font-semibold text-primary">
                  {category.productCount} {category.productCount === 1 ? "plan" : "plans"}
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
