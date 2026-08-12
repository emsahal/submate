import { cn } from "@/lib/utils";
import Link from "next/link";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center font-heading text-2xl font-black tracking-tight shrink-0", className)}>
      <span className="text-foreground transition-colors duration-200 group-hover:text-primary">Sub</span>
      <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent transition-all duration-200 group-hover:brightness-110">
        Mate
      </span>
      <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
    </Link>
  );
}


