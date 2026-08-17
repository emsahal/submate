import type { MetadataRoute } from "next";
import { backendUrl } from "@/lib/api";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const staticRoutes = ["/", "/subscriptions", "/categories", "/blog", "/faq", "/about", "/contact", "/privacy", "/terms", "/refund-policy"];

/** Max items per API request (matches backend limit for products). */
const PAGE_SIZE = 48;

/**
 * Fetch all pages from a paginated endpoint.
 * Keeps requesting with increasing offsets until all items are retrieved.
 */
async function fetchAllPaginated<T>(
  path: string,
  pageSize: number = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(
        `${backendUrl}/api${path}?limit=${pageSize}&offset=${offset}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) break;
      const data = await res.json();
      const items: T[] = data.items ?? [];
      all.push(...items);
      // Stop when we've received fewer items than requested (last page)
      // or when we've fetched all items indicated by the total count
      if (items.length < pageSize || (data.total != null && all.length >= data.total)) {
        break;
      }
      offset += pageSize;
    } catch {
      break;
    }
  }

  return all;
}

interface SlugItem {
  slug: string;
  updatedAt?: string | null;
  publishedAt?: string | null;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }));

  try {
    const [products, categories, posts] = await Promise.all([
      fetchAllPaginated<SlugItem>("/products"),
      fetch(`${backendUrl}/api/categories`, { next: { revalidate: 3600 } })
        .then((r) => r.json())
        .catch(() => []),
      fetchAllPaginated<SlugItem>("/blog"),
    ]);

    for (const p of products) {
      entries.push({
        url: `${SITE_URL}/subscriptions/${p.slug}`,
        lastModified: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
    for (const c of Array.isArray(categories) ? categories : []) {
      entries.push({
        url: `${SITE_URL}/categories/${c.slug}`,
        lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
    for (const b of posts) {
      entries.push({
        url: `${SITE_URL}/blog/${b.slug}`,
        lastModified: b.publishedAt ? new Date(b.publishedAt) : new Date(),
        changeFrequency: "monthly",
        priority: 0.5,
      });
    }
  } catch {
    // Backend offline during generation — static routes only.
  }

  return entries;
}
