import { cn } from "@/lib/utils";
import Link from "next/link";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group flex items-center gap-2.5 font-heading text-xl font-bold tracking-tight", className)}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-500 text-sm font-bold text-primary-foreground shadow-[0_2px_8px_-2px_rgba(14,124,107,0.6)] transition-transform duration-200 group-hover:scale-105">
        S
      </span>
      <span>Subly</span>
    </Link>
  );
}
