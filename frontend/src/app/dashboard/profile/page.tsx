"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import type { MeProfile } from "@/types/shared";
import { get, patch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ProfilePage() {
  const [profile, setProfile] = React.useState<MeProfile | null>(null);
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    get<{ profile: MeProfile }>("/me").then((data) => {
      setProfile(data.profile);
      setPhone(data.profile.phone ?? "");
    });
  }, []);

  async function save() {
    setSaving(true);
    try {
      await patch("/me/profile", { phone: phone.trim() });
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Your account details and preferences.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="h-14 w-14">
            {profile.image ? <AvatarImage src={profile.image} alt={profile.name} /> : null}
            <AvatarFallback className="text-lg">{profile.name.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{profile.name}</CardTitle>
              <Badge variant={profile.role === "ADMIN" ? "default" : "secondary"}>{profile.role}</Badge>
            </div>
            <CardDescription>
              {profile.email} · joined {formatDate(profile.createdAt)}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number (optional)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX XXXXXXX" maxLength={30} />
            <p className="text-xs text-muted-foreground">Used for order communication. Leave blank to keep it private.</p>
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
