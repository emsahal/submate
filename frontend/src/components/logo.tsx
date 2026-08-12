import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-2 font-heading text-2xl font-black tracking-tight", className)}>
      <div className="relative h-8 w-8 overflow-hidden rounded-full border border-border/40 bg-background/50">
        <Image
          src="/logo.png"
          alt="SubMate"
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div>
        <span className="text-foreground transition-colors duration-200 group-hover:text-primary">Sub</span>
        <span className="bg-gradient-to-r from-primary via-emerald-500 to-teal-400 bg-clip-text text-transparent transition-all duration-200 group-hover:brightness-110">
          Mate
        </span>
        <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
      </div>
    </Link>
  );
}

