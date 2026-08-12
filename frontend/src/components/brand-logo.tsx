import * as React from "react";
import { cn } from "@/lib/utils";
import { NetflixIcon } from "@/components/icons/logos-netflix";
import { AmazonIcon } from "@/components/icons/mage-amazon";
import { DisneyPlusIcon } from "@/components/icons/cbi-disney-plus";
import { HboMaxIcon } from "@/components/icons/hbo-max";
import { CanvaIcon } from "@/components/icons/canva";
import { YoutubeIcon } from "@/components/icons/logos-youtube";
import { SpotifyIcon } from "@/components/icons/cbi-spotify";
import { AdobeIcon } from "@/components/icons/logos-adobe";

export type LogoIconProps = {
  className?: string;
  size?: number;
  color?: string;
};

const brandLogos: Record<string, React.ComponentType<LogoIconProps>> = {
  netflix: NetflixIcon,
  "amazon-prime-video": AmazonIcon,
  "disney-plus": DisneyPlusIcon,
  "hbo-max": HboMaxIcon,
  "canva-pro": CanvaIcon,
  "youtube-premium": YoutubeIcon,
  "spotify-premium": SpotifyIcon,
  "adobe-creative-cloud": AdobeIcon,
};

/** Official brand mark for a product slug, black in light mode, white in dark mode. */
export function BrandLogo({ slug, className, size = 64 }: { slug: string; className?: string; size?: number }) {
  const Icon = brandLogos[slug];
  if (!Icon) return null;
  const colorClass = "text-black dark:text-white";
  if (slug === "canva-pro") {
    return <CanvaIcon size={size} monochrome className={cn(colorClass, className)} />;
  }
  return <Icon size={size} color="currentColor" className={cn(colorClass, className)} />;
}
