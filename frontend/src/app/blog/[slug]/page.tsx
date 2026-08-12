import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchBlogPost } from "@/lib/site-data";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { BlurHeading } from "@/components/section-heading";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const post = await fetchBlogPost(slug);
    return {
      title: post.seoTitle ?? post.title,
      description: post.seoDescription ?? post.excerpt,
    };
  } catch {
    return { title: "Blog post" };
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  let post;
  try {
    post = await fetchBlogPost(slug);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16 sm:py-20">
      <div className="mb-8 space-y-4">
        {post.tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full px-2.5 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        ) : null}
        <BlurHeading text={post.title} className="display-2xl" as="h1" />
        {post.publishedAt ? (
          <p className="text-sm text-muted-foreground">{formatDate(post.publishedAt)}</p>
        ) : null}
      </div>
      <article className="prose-subly" dangerouslySetInnerHTML={{ __html: post.content }} />
    </div>
  );
}
