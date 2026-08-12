"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { toast } from "sonner";
import type { PublicReview } from "@shared/types";
import { formatDate } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { post } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function ProductReviews({ productId, reviews }: { productId: number; reviews: PublicReview[] }) {
  const session = useSession();
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function submitReview() {
    setSubmitting(true);
    try {
      await post("/reviews", { productId, rating, comment });
      toast.success("Review submitted for moderation.");
      setComment("");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="mb-4 font-heading text-xl font-semibold">Customer reviews</h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-border p-4">
              <div className="mb-2 flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{review.userName.slice(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{review.userName}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("h-4 w-4", i < review.rating ? "fill-warning text-warning" : "text-muted")} />
                  ))}
                </div>
              </div>
              {review.comment ? <p className="text-sm text-foreground/85">{review.comment}</p> : null}
            </div>
          ))}
        </div>
      )}

      {session.data ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Write a review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="rating" className="mr-1">
                Rating
              </Label>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n === 1 ? "" : "s"}`}>
                  <Star className={cn("h-5 w-5", n <= rating ? "fill-warning text-warning" : "text-muted")} />
                </button>
              ))}
            </div>
            <div>
              <Label htmlFor="review-comment" className="mb-1 block">
                Comment (optional)
              </Label>
              <Textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Share your experience…"
                maxLength={2000}
              />
            </div>
            <Button onClick={submitReview} disabled={submitting}>
              {submitting ? "Submitting…" : "Submit review"}
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
