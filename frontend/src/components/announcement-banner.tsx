"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, MessageCircle, X } from "lucide-react";
import { maintenanceConfig } from "@/config/site";

export function AnnouncementBanner() {
  const [dismissed, setDismissed] = React.useState(false);

  if (!maintenanceConfig.showMaintenanceBanner || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Service announcement"
      className="relative z-50 w-full border-b border-amber-500/30 bg-gradient-to-r from-amber-950/90 via-amber-900/80 to-amber-950/90 px-4 py-2.5 text-amber-100 shadow-sm backdrop-blur"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex flex-1 items-center gap-2.5 overflow-hidden">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
            <AlertTriangle className="h-3 w-3" />
          </span>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-inset ring-amber-500/30">
              {maintenanceConfig.bannerBadge}
            </span>
            <span className="font-medium text-amber-100/95">
              {maintenanceConfig.bannerMessage}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {maintenanceConfig.actionHref && (
            <a
              href={maintenanceConfig.actionHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-1 font-medium text-amber-200 ring-1 ring-amber-500/40 transition-colors hover:bg-amber-500/30 hover:text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span>{maintenanceConfig.actionText}</span>
              <ArrowRight className="h-3 w-3" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-amber-300/70 transition-colors hover:bg-amber-500/20 hover:text-amber-100"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
