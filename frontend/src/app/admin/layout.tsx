"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Banknote,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Package,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/payment-review", label: "Payment review", icon: ListChecks },
  { href: "/admin/orders", label: "Orders", icon: Package },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: ScrollText },
  { href: "/admin/products", label: "Products", icon: CreditCard },
  { href: "/admin/categories", label: "Categories", icon: Package },
  { href: "/admin/payment-methods", label: "Payment methods", icon: Banknote },
  { href: "/admin/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/admin/blog", label: "Blog", icon: FileText },
  { href: "/admin/faqs", label: "FAQs", icon: HelpCircle },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/audit-log", label: "Audit log", icon: ShieldCheck },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const user = session?.user as { role?: string } | undefined;

  React.useEffect(() => {
    if (!isPending && (!session || user?.role !== "ADMIN")) {
      router.replace("/dashboard");
    }
  }, [isPending, session, user?.role, router]);

  if (isPending || !session || user?.role !== "ADMIN") {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold">Admin</h1>
        <p className="text-muted-foreground">Manage payments, orders, products and content.</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-20 max-h-[calc(100vh-6rem)] space-y-1 overflow-y-auto pb-6">
            {navItems.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                    active && "bg-accent text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0">
          <nav className="mobile-tabs-scroll mb-6 flex gap-1 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(item.href);
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
