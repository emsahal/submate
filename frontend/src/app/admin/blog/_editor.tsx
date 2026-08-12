"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { get, patch, post } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";

type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  category: string | null;
  tags: string[];
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
};

export function BlogEditor({ postId }: { postId?: number }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(Boolean(postId));
  const [form, setForm] = React.useState<Post>({
    id: 0,
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    coverImage: null,
    category: null,
    tags: [],
    status: "DRAFT",
    seoTitle: null,
    seoDescription: null,
  });
  const [tags, setTags] = React.useState("");
  const [isPublished, setIsPublished] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!postId) return;
    get<{ post: Post }>(`/admin/blog/${postId}`)
      .then((d) => {
        setForm(d.post);
        setTags(d.post.tags.join(", "));
        setIsPublished(d.post.status === "PUBLISHED");
      })
      .catch((err) => toast.error(formatError(err)))
      .finally(() => setLoading(false));
  }, [postId]);

  function set<K extends keyof Post>(key: K, value: Post[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setSaving(true);
    const body = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt,
      content: form.content,
      coverImage: form.coverImage ?? "",
      category: form.category ?? undefined,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      isPublished,
    };
    try {
      if (postId) {
        await patch(`/admin/blog/${postId}`, body);
        toast.success("Post saved.");
      } else {
        const res = await post<{ post: { id: number } }>("/admin/blog", body);
        toast.success("Post created.");
        router.replace(`/admin/blog/${res.post.id}`);
      }
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/admin/blog">
              <ArrowLeft className="h-4 w-4" /> Back to blog
            </Link>
          </Button>
          <h1 className="font-heading text-2xl font-bold">{postId ? "Edit post" : "New post"}</h1>
        </div>
        <Button onClick={save} disabled={saving || !form.title.trim()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={form.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="excerpt">Excerpt</Label>
              <Textarea id="excerpt" value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Body</Label>
              <Textarea id="content" value={form.content} onChange={(e) => set("content", e.target.value)} rows={16} placeholder={"Write the article here. Supports plain text and paragraphs.\n\nSeparate paragraphs with a blank line."} />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publishing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Published</p>
                  <p className="text-xs text-muted-foreground">Visible on the public blog.</p>
                </div>
                <Switch checked={isPublished} onCheckedChange={setIsPublished} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={form.category ?? ""} onChange={(e) => set("category", e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cover">Cover image URL</Label>
                <Input id="cover" value={form.coverImage ?? ""} onChange={(e) => set("coverImage", e.target.value || null)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">SEO</CardTitle>
              <CardDescription>Optional; falls back to title and excerpt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="seot">SEO title</Label>
                <Input id="seot" value={form.seoTitle ?? ""} onChange={(e) => set("seoTitle", e.target.value || null)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seod">SEO description</Label>
                <Textarea id="seod" value={form.seoDescription ?? ""} onChange={(e) => set("seoDescription", e.target.value || null)} rows={2} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
