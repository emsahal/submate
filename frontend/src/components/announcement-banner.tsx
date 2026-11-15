"use client";

import * as React from "react";
import { AlertOctagon, AlertTriangle } from "lucide-react";
import { maintenanceConfig } from "@/config/site";

export function AnnouncementBanner() {
  if (!maintenanceConfig.showMaintenanceNotice) {
    return null;
  }

  return (
    <aside
      aria-label="Service maintenance notice"
      className="relative z-50 w-full border-b-2 border-amber-500/50 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 px-4 py-4 sm:py-5 text-amber-100 shadow-lg"
    >
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 text-center sm:flex-row sm:items-start sm:gap-4 sm:text-left">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/40">
          <AlertOctagon className="h-7 w-7 animate-pulse text-amber-400" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/25 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-300 ring-1 ring-inset ring-amber-500/40">
              <AlertTriangle className="h-3.5 w-3.5" />
              {maintenanceConfig.badge}
            </span>
            <span className="text-sm font-bold text-white sm:text-base tracking-tight">
              {maintenanceConfig.headline}
            </span>
          </div>
          <p className="text-xs sm:text-sm leading-relaxed text-amber-200/95 font-medium">
            {maintenanceConfig.description}
          </p>
          <p className="text-[11px] sm:text-xs text-amber-300/80 leading-relaxed">
            {maintenanceConfig.subNotice}
          </p>
        </div>
      </div>
    </aside>
  );
}
