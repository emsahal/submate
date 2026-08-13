"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { footerLinks, siteConfig } from "@/config/site";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname === "/auth" || pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="footer-grid grid gap-10 md:grid-cols-4">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{siteConfig.description}</p>
            <div className="flex flex-wrap gap-2">
              {["PKR pricing", "Admin verified", "Encrypted"].map((b) => (
                <span key={b} className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground">
                  {b}
                </span>
              ))}
            </div>
          </div>

          {(
            [
              { title: "Marketplace", links: footerLinks.marketplace },
              { title: "Company", links: footerLinks.company },
              { title: "Legal", links: footerLinks.legal },
            ] as const
          ).map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-semibold">{section.title}</h3>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-border pt-6 text-xs text-muted-foreground leading-relaxed">
          <p>
            <strong>Disclaimer:</strong> SubMate is an independent, third-party subscription marketplace. We are not affiliated with, associated with, authorized by, endorsed by, or in any way officially connected to Netflix, Spotify, Canva, YouTube, Adobe, Amazon, Disney, HBO, or any of their subsidiaries or affiliates. All product and company names, logos, brands, and trademarks referenced on this website are the property of their respective owners. Use of these names, logos, and brands does not imply endorsement or affiliation.
          </p>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {siteConfig.legalName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
