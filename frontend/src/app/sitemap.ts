import type { MetadataRoute } from "next";
import { backendUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const staticRoutes = ["/", "/subscriptions", "/categories", "/blog", "/faq", "/about", "/contact", "/privacy", "/terms", "/refund-policy"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));

  try {
    const [products, categories, posts] = await Promise.all([
      fetch(`${backendUrl}/api/public/products?limit=200`).then((r) => r.json()).catch(() => ({ items: [] })),
      fetch(`${backendUrl}/api/public/categories`).then((r) => r.json()).catch(() => []),
      fetch(`${backendUrl}/api/public/blog?limit=200`).then((r) => r.json()).catch(() => ({ items: [] })),
    ]);

    for (const p of products.items ?? []) {
      entries.push({ url: `${SITE_URL}/subscriptions/${p.slug}`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 });
    }
    for (const c of Array.isArray(categories) ? categories : []) {
      entries.push({ url: `${SITE_URL}/categories/${c.slug}`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 });
    }
    for (const b of posts.items ?? []) {
      entries.push({ url: `${SITE_URL}/blog/${b.slug}`, lastModified: b.publishedAt ? new Date(b.publishedAt) : new Date(), changeFrequency: "monthly", priority: 0.5 });
    }
  } catch {
    // Backend offline during build — static routes only.
  }

  return entries;
}
