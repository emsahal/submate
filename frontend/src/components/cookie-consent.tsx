"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

export function CookieConsent() {
  const [showBanner, setShowBanner] = React.useState(false);
  const [showPreferences, setShowPreferences] = React.useState(false);

  // Categories
  const [analytics, setAnalytics] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);

  React.useEffect(() => {
    const consent = localStorage.getItem("submate-cookie-consent");
    if (!consent) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(consent);
        setAnalytics(!!parsed.analytics);
        setMarketing(!!parsed.marketing);
      } catch {
        // Fallback
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const consent = { necessary: true, analytics: true, marketing: true };
    localStorage.setItem("submate-cookie-consent", JSON.stringify(consent));
    setAnalytics(true);
    setMarketing(true);
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    const consent = { necessary: true, analytics, marketing };
    localStorage.setItem("submate-cookie-consent", JSON.stringify(consent));
    setShowPreferences(false);
    setShowBanner(false);
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border border-border bg-card p-4 shadow-lg sm:bottom-6 sm:left-6 sm:right-auto sm:mx-0 sm:max-w-md"
            role="alert"
            aria-live="polite"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <h4 className="font-heading text-sm font-bold tracking-tight text-foreground">
                    🍪 We use cookies
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    We use cookies to improve your experience and understand how our website is used.
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 -mr-1 -mt-1 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowBanner(false)}
                  aria-label="Dismiss cookie notice"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-end gap-2 mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreferences(true)}
                  className="text-xs font-semibold"
                >
                  Manage Preferences
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAcceptAll}
                  className="text-xs font-semibold px-4 bg-primary text-primary-foreground hover:bg-primary/95"
                >
                  Accept
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold">Cookie Preferences</DialogTitle>
            <DialogDescription className="text-xs">
              Manage your choice of cookies. Necessary cookies are always enabled to ensure key site features work.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Strictly Necessary */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/40 p-3">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-foreground">Strictly Necessary</Label>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Required for essential security, authentication, and core operations of the marketplace.
                </p>
              </div>
              <Switch checked disabled aria-label="Necessary cookies (always enabled)" />
            </div>

            {/* Analytics */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/40 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="analytics" className="text-xs font-bold text-foreground">Analytics Cookies</Label>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Allows us to monitor website usage, trace user paths, and analyze performance data.
                </p>
              </div>
              <Switch
                id="analytics"
                checked={analytics}
                onCheckedChange={setAnalytics}
                aria-label="Toggle Analytics cookies"
              />
            </div>

            {/* Marketing */}
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-muted/40 p-3">
              <div className="space-y-0.5">
                <Label htmlFor="marketing" className="text-xs font-bold text-foreground">Marketing Cookies</Label>
                <p className="text-[10px] text-muted-foreground leading-snug">
                  Used to deliver relevant promotional content, ads, and personalizations.
                </p>
              </div>
              <Switch
                id="marketing"
                checked={marketing}
                onCheckedChange={setMarketing}
                aria-label="Toggle Marketing cookies"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreferences(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSavePreferences}
              className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/95"
            >
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
