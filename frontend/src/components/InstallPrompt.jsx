import React, { useEffect, useState } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "gpsc_pwa_install_dismissed_at";
const DISMISS_DAYS = 14;

/**
 * InstallPrompt — registers the service worker and shows a custom
 * "Add to home screen" prompt when the browser fires beforeinstallprompt.
 *
 * - Hidden if the user dismissed within DISMISS_DAYS days.
 * - Hidden if already installed (display-mode: standalone).
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Register service worker (production only — webpack-dev-server serves
    // bundled JS with cache headers that confuse SW caching)
    if ("serviceWorker" in navigator && window.location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Silent — SW is enhancement, not required
      });
    }

    // Don't show if already installed
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) return;

    // Honor recent dismissal
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY));
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 24 * 3600 * 1000) {
      return;
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
      // Slight delay so users see content first
      setTimeout(() => setShow(true), 2500);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", () => {
      setShow(false);
      localStorage.setItem(DISMISS_KEY, "0");
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setShow(false);
      } else {
        dismiss();
      }
    } catch {
      dismiss();
    } finally {
      setDeferred(null);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  if (!show || !deferred) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-40 max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg p-4 page-enter"
      data-testid="pwa-install-prompt"
    >
      <button
        onClick={dismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 p-1"
        aria-label="Dismiss"
        data-testid="pwa-dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
          G
        </div>
        <div className="pr-6">
          <p className="text-sm font-semibold text-gray-900">Install GPSC Track</p>
          <p className="text-xs text-gray-600 mt-1 font-gujarati leading-relaxed">
            Home screen પર add કરો — fast, offline access સાથે.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={install} className="flex-1 bg-blue-600 hover:bg-blue-700 btn-lift" data-testid="pwa-install-btn">
          <Download className="h-4 w-4 mr-1.5" /> Install
        </Button>
        <Button size="sm" variant="outline" onClick={dismiss} className="flex-1">
          Later
        </Button>
      </div>
    </div>
  );
}
