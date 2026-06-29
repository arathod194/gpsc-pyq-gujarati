import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";

const CLIENT = process.env.REACT_APP_ADSENSE_CLIENT;
const SLOT = process.env.REACT_APP_ADSENSE_SLOT_INLINE;
const SESSION_KEY = "gpsc_ad_sticky_dismissed";

/**
 * Sticky bottom ad banner — mobile only (md:hidden).
 * Hidden for logged-in users. Dismissable for the session.
 */
export default function StickyAd() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(sessionStorage.getItem(SESSION_KEY) === "1");
  }, []);

  useEffect(() => {
    if (user || dismissed) return;
    if (!CLIENT || !SLOT) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // ignore
    }
  }, [user, dismissed]);

  const close = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setDismissed(true);
  };

  if (!mounted || user || dismissed) return null;

  // Dev placeholder when no AdSense client configured
  if (!CLIENT || !SLOT) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-gray-100/95 backdrop-blur border-t border-gray-200 px-3 py-2 flex items-center gap-2"
        data-testid="sticky-ad-placeholder"
      >
        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Ad</span>
        <div className="flex-1 text-xs text-gray-400 truncate">AdSense sticky banner — placeholder</div>
        <button
          onClick={close}
          aria-label="Dismiss ad"
          className="text-gray-400 hover:text-gray-700 p-1"
          data-testid="sticky-ad-dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200"
      data-testid="sticky-ad"
    >
      <div className="flex items-start gap-2 px-2 py-1">
        <div className="flex-1 min-h-[60px] max-h-[100px] overflow-hidden">
          <ins
            className="adsbygoogle"
            style={{ display: "block", minHeight: "60px" }}
            data-ad-client={CLIENT}
            data-ad-slot={SLOT}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
        <button
          onClick={close}
          aria-label="Dismiss ad"
          className="text-gray-400 hover:text-gray-700 p-1 mt-1"
          data-testid="sticky-ad-dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
