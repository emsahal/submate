"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, LogIn, LogOut, Menu, User, X } from "lucide-react";
import { navLinks } from "@/config/site";
import { cn } from "@/lib/utils";
import { useSession, signOut, signInWithGoogle } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: sessionData, isPending } = useSession();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const user = sessionData?.user as { id: string; name: string; email: string; image?: string | null; role?: "USER" | "ADMIN" } | undefined;

  if (pathname === "/auth") return null;

  function handleSignOut() {
    signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 sm:px-10 lg:px-16">
        <div className="flex items-center">
          <Logo />
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                pathname?.startsWith(link.href) && "bg-accent text-accent-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-2">
          {/* Desktop Only: Theme and Sign In */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {!isPending &&
              (user ? (
                <>
                  <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                    <Link href="/dashboard">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded-full focus-visible:outline-2 focus-visible:outline-ring" aria-label="Account menu">
                        <Avatar className="h-8 w-8">
                          {user.image ? <AvatarImage src={user.image} alt={user.name} /> : null}
                          <AvatarFallback>{(user.name ?? user.email ?? "U").slice(0, 1).toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>
                        <div className="text-sm font-medium">{user.name}</div>
                        <div className="text-xs font-normal text-muted-foreground">{user.email}</div>
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                          <LayoutDashboard className="h-4 w-4" /> Dashboard
                        </Link>
                      </DropdownMenuItem>
                      {user.role === "ADMIN" && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin">
                            <User className="h-4 w-4" /> Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="h-4 w-4" /> Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => router.push("/auth")}>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Button>
              ))}
          </div>

          {/* Hamburger button: always on the far right on mobile */}
          <Button variant="ghost" size="icon" className="md:hidden -mr-2" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav className="border-t border-border px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent">
                Dashboard
              </Link>
            ) : (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  router.push("/auth");
                }}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-primary hover:bg-accent"
              >
                Sign in
              </button>
            )}
            
            {/* Mobile Theme Toggle inside drawer */}
            <div className="flex items-center justify-between border-t border-border mt-3 pt-3 px-3">
              <span className="text-sm font-medium text-muted-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
