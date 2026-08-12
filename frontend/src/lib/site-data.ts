import { api } from "@/lib/api";
import type {
  PublicCategory,
  PublicProduct,
  PublicReview,
  PublicBlogPost,
  PublicBlogPostDetail,
  PublicFaq,
  PublicPaymentMethod,
  Paginated,
} from "@/types/shared";

export type ProductFilters = {
  search?: string;
  category?: string;
  sort?: "popular" | "price_asc" | "price_desc" | "newest";
  limit?: number;
};

export async function fetchProducts(filters: ProductFilters = {}): Promise<Paginated<PublicProduct>> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.category) params.set("category", filters.category);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.limit) params.set("limit", String(filters.limit));
  return api<Paginated<PublicProduct>>(`/products?${params.toString()}`);
}

export async function fetchProduct(slug: string): Promise<{
  product: PublicProduct;
  reviews: PublicReview[];
  reviewSummary: { average: number; count: number };
}> {
  return api(`/products/${slug}`);
}

export async function fetchCategories(): Promise<PublicCategory[]> {
  return api<PublicCategory[]>("/categories");
}

export async function fetchPaymentMethods(): Promise<PublicPaymentMethod[]> {
  return api<PublicPaymentMethod[]>("/payment-methods");
}

export async function fetchBlogPosts(limit = 12): Promise<Paginated<PublicBlogPost>> {
  return api<Paginated<PublicBlogPost>>(`/blog?limit=${limit}`);
}

export async function fetchBlogPost(slug: string): Promise<PublicBlogPostDetail> {
  return api<PublicBlogPostDetail>(`/blog/${slug}`);
}

export async function fetchFaqs(): Promise<PublicFaq[]> {
  return api<PublicFaq[]>("/faqs");
}
