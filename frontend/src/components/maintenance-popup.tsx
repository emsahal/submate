"use client";

import * as React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { maintenanceConfig } from "@/config/site";

export function MaintenancePopup() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (maintenanceConfig.showMaintenanceNotice) {
      setOpen(true);
    }
  }, []);

  if (!maintenanceConfig.showMaintenanceNotice) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md sm:max-w-lg border-2 border-amber-500/50 bg-background/95 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl sm:rounded-2xl">
        <DialogHeader className="flex flex-col items-center text-center space-y-3.5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500 ring-2 ring-amber-500/30">
            <AlertTriangle className="h-8 w-8 text-amber-500 animate-pulse" />
          </div>

          <div className="space-y-1">
            <span className="inline-block rounded-md bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/30">
              Notice
            </span>
            <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Website Currently Offline
            </DialogTitle>
          </div>

          <DialogDescription asChild>
            <div className="text-sm sm:text-base leading-relaxed text-muted-foreground pt-1 space-y-3">
              <p>
                SubMate is currently not operational due to scheduled maintenance and system upgrades.
              </p>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs sm:text-sm text-foreground/90 font-medium">
                ⚠️ New orders, subscriptions, and payment processing are completely suspended. Please do not submit any payments.
              </div>
              <p className="text-xs text-muted-foreground">
                Support channels are temporarily closed. All operations will resume automatically once updates are finished.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-4 sm:mt-5 flex justify-center sm:justify-center">
          <Button
            type="button"
            onClick={() => setOpen(false)}
            size="lg"
            className="w-full sm:w-auto min-w-36 font-semibold"
          >
            I Understand
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
