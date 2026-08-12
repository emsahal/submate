"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, UploadCloud } from "lucide-react";
import type { OrderDetail, PublicPaymentMethod } from "@/types/shared";
import { apiUrl } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MAX_BYTES = 6 * 1024 * 1024;
const ALLOWED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

export function PaymentUpload({
  order,
  methods,
  onSubmitted,
}: {
  order: OrderDetail;
  methods: PublicPaymentMethod[];
  onSubmitted: () => void;
}) {
  const [methodId, setMethodId] = React.useState<string>(methods[0] ? String(methods[0].id) : "");
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const selectedMethod = methods.find((m) => String(m.id) === methodId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!methodId || !file) {
      toast.error("Select a payment method and upload your screenshot.");
      return;
    }
    if (!ALLOWED.includes(file.type)) {
      toast.error("Please upload a PNG, JPG or WEBP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Screenshot is too large (max 6MB).");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("paymentMethodId", methodId);
      form.append("screenshot", file);
      const res = await fetch(apiUrl(`/me/orders/${order.id}/payment`), {
        method: "POST",
        credentials: "include",
        body: form,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Upload failed. Please try again.");
      }
      toast.success("Payment submitted! Our team is verifying it.");
      setFile(null);
      onSubmitted();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload payment proof</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Payment method</Label>
          <Select value={methodId} onValueChange={setMethodId}>
            <SelectTrigger>
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent>
              {methods.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedMethod ? (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
            <p className="font-medium">Instructions — {selectedMethod.name}</p>
            {selectedMethod.accountDetails ? (
              <ul className="mt-2 space-y-1 text-muted-foreground">
                {Object.entries(selectedMethod.accountDetails).map(([key, value]) => (
                  <li key={key}>
                    <span className="font-medium capitalize text-foreground">{key.replace(/_/g, " ")}:</span>{" "}
                    <span className="font-mono">{value}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            {selectedMethod.instructions ? <p className="mt-2 text-muted-foreground">{selectedMethod.instructions}</p> : null}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="screenshot">Screenshot</Label>
            <label
              htmlFor="screenshot"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-accent/30"
            >
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {file ? file.name : "Click to choose a screenshot"}
              </span>
              <span className="text-xs text-muted-foreground">PNG, JPG or WEBP · max 6MB</span>
              <input
                id="screenshot"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Submit for verification
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
