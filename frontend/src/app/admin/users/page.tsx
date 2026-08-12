"use client";

import * as React from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { get, patch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { formatError } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";

type UserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: string;
  isSuspended: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [items, setItems] = React.useState<UserRow[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  async function load(s?: string) {
    try {
      const d = await get<{ items: UserRow[] }>(`/admin/users${s ? `?search=${encodeURIComponent(s)}` : ""}`);
      setItems(d.items);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function setStatus(u: UserRow, role?: "USER" | "ADMIN", isSuspended?: boolean) {
    try {
      await patch(`/admin/users/${u.id}`, { role, isSuspended });
      toast.success("User updated.");
      await load(search);
    } catch (err) {
      toast.error(formatError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">Manage roles and access.</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(search);
          }}
        >
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email" className="w-64" />
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </div>

      {error ? (
        <EmptyState title="Couldn't load users" description={error} />
      ) : !items ? (
        <Skeleton className="h-96" />
      ) : items.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No users" description="No users match your search." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((u) => (
                    <tr key={u.id} className="transition-colors hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={u.image} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">{u.name?.charAt(0) || "?"}</div>
                          )}
                          <div>
                            <p className="font-medium">
                              {u.name} {u.isSuspended ? <Badge variant="destructive">Suspended</Badge> : null}
                            </p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.role === "ADMIN" ? "info" : "secondary"}>{u.role}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {u.role === "ADMIN" ? (
                            <Button variant="outline" size="sm" onClick={() => setStatus(u, "USER")}>
                              Demote
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => setStatus(u, "ADMIN")}>
                              Make admin
                            </Button>
                          )}
                          {u.isSuspended ? (
                            <Button variant="outline" size="sm" onClick={() => setStatus(u, undefined, false)}>
                              Unsuspend
                            </Button>
                          ) : (
                            <Button variant="destructive" size="sm" onClick={() => setStatus(u, undefined, true)}>
                              Suspend
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
