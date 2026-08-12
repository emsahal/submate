"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LayoutDashboard, Package, ScrollText, UserRound } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Logo } from "@/components/logo";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/orders", label: "Orders", icon: Package },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: ScrollText },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (!isPending && !session) {
      router.replace(`/auth?callback=${encodeURIComponent(pathname ?? "/dashboard")}`);
    }
  }, [isPending, session, router, pathname]);

  if (isPending || !session) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 space-y-1">
            {navItems.map((item) => {
              const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    active && "bg-accent text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <Logo />
          </div>
          <nav className="mb-6 flex gap-1 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => {
              const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent",
                    active && "bg-accent text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {children}
        </main>
      </div>
    </div>
  );
}
