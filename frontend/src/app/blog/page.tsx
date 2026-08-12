import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { fetchBlogPosts } from "@/lib/site-data";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Eyebrow, BlurHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Blog",
  description: "Guides and updates from SubMate about digital subscriptions in Pakistan.",
};

export default async function BlogPage() {
  let posts;
  try {
    posts = await fetchBlogPosts();
  } catch {
    posts = { items: [] };
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
      <div className="max-w-2xl">
        <Reveal>
          <Eyebrow>Guides &amp; updates</Eyebrow>
        </Reveal>
        <BlurHeading text="The SubMate blog" className="display-2xl mt-5" as="h1" />
        <Reveal delay={150}>
          <p className="lead-lg mt-5 text-muted-foreground">
            Guides, updates and honest advice about subscriptions in Pakistan.
          </p>
        </Reveal>
      </div>

      {posts.items.length === 0 ? (
        <div className="mt-12">
          <EmptyState title="No posts yet" description="Check back soon." />
        </div>
      ) : (
        <div className="mt-12 space-y-6">
          {posts.items.map((post, i) => (
            <Reveal key={post.slug} delay={i * 60}>
              <Link
                href={`/blog/${post.slug}`}
                className="card-bubble card-lift group flex flex-col gap-4 rounded-2xl border border-border bg-card p-7 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    {post.publishedAt ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CalendarDays className="h-3.5 w-3.5" /> {formatDate(post.publishedAt)}
                      </span>
                    ) : null}
                    {post.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="rounded-full px-2.5 py-0.5 text-[11px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <h2 className="font-heading text-xl font-semibold tracking-tight transition-colors group-hover:text-primary">
                    {post.title}
                  </h2>
                  {post.excerpt ? <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p> : null}
                </div>
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-all duration-300 group-hover:border-primary/40 group-hover:text-primary">
                  <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
