"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { del, get, post } from "@/lib/api";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

type MethodRow = {
  id: number;
  name: string;
  type: string;
  accountDetails: Record<string, string>;
  instructions: string | null;
  isActive: boolean;
};

export default function AdminPaymentMethodsPage() {
  const [items, setItems] = React.useState<MethodRow[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("EASYPAISA");
  const [accountNumber, setAccountNumber] = React.useState("");
  const [accountTitle, setAccountTitle] = React.useState("");
  const [instructions, setInstructions] = React.useState("");

  async function load() {
    try {
      const d = await get<{ items: MethodRow[] }>("/admin/payment-methods");
      setItems(d.items);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function create() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await post("/admin/payment-methods", {
        name: name.trim(),
        type: type as never,
        accountDetails: { accountNumber: accountNumber.trim(), accountTitle: accountTitle.trim() },
        instructions: instructions || undefined,
      });
      toast.success("Payment method created.");
      setOpen(false);
      setName("");
      setAccountNumber("");
      setAccountTitle("");
      setInstructions("");
      await load();
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(m: MethodRow) {
    try {
      const { patch } = await import("@/lib/api");
      await patch(`/admin/payment-methods/${m.id}`, { isActive: !m.isActive });
      await load();
    } catch (err) {
      toast.error(formatError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Payment methods</h1>
          <p className="text-muted-foreground">Accounts customers send money to.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> New method
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New payment method</DialogTitle>
              <DialogDescription>These details are shown to customers at checkout.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mname">Name</Label>
                <Input id="mname" value={name} onChange={(e) => setName(e.target.value)} placeholder="Easypaisa" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mtype">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger id="mtype">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EASYPAISA">Easypaisa</SelectItem>
                    <SelectItem value="JAZZCASH">JazzCash</SelectItem>
                    <SelectItem value="NAYAPAY">NayaPay</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank transfer</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mnum">Account number</Label>
                <Input id="mnum" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mtitle">Account title</Label>
                <Input id="mtitle" value={accountTitle} onChange={(e) => setAccountTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minst">Instructions</Label>
                <Input id="minst" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="e.g. Send exact amount and upload the receipt" />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={create} disabled={busy || !name.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {error ? (
        <EmptyState title="Couldn't load payment methods" description={error} />
      ) : !items ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No payment methods" description="Add where customers should send payments." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {items.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{m.name}</p>
                      <Badge variant="secondary">{m.type}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.accountDetails.accountNumber ?? ""} {m.accountDetails.accountTitle ? `· ${m.accountDetails.accountTitle}` : ""}
                    </p>
                    {m.instructions ? <p className="text-xs text-muted-foreground">{m.instructions}</p> : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={m.isActive ? "success" : "outline"} size="sm" onClick={() => toggle(m)}>
                      {m.isActive ? "Active" : "Disabled"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
