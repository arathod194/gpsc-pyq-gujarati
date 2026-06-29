import React, { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";

const CLIENT = process.env.REACT_APP_ADSENSE_CLIENT;
let scriptLoaded = false;

function loadScript() {
  if (scriptLoaded || !CLIENT || typeof document === "undefined") return;
  if (document.querySelector('script[data-adsense="1"]')) {
    scriptLoaded = true;
    return;
  }
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  s.setAttribute("data-adsense", "1");
  document.head.appendChild(s);
  scriptLoaded = true;
}

/**
 * AdSlot — Google AdSense responsive ad unit.
 * Hidden for logged-in users. Renders nothing if no publisher client ID is set.
 *
 * Props:
 *   slot: AdSense slot ID (string)
 *   format: 'auto' | 'fluid' | 'rectangle' (default 'auto')
 *   layout: optional layout key for fluid units
 *   className: wrapper classes
 *   label: small "Advertisement" label (default true)
 */
export default function AdSlot({ slot, format = "auto", layout, className = "", label = true }) {
  const { user } = useAuth();
  const insRef = useRef(null);

  useEffect(() => {
    if (user) return;
    if (!CLIENT || !slot) return;
    loadScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      // No-op: AdSense pushes can throw before the script loads
    }
  }, [user, slot]);

  // Hide ads for logged-in users (subscription perk later)
  if (user) return null;
  if (!CLIENT || !slot) {
    // Placeholder for development so layout shifts are visible
    if (process.env.NODE_ENV !== "production") {
      return (
        <div className={`my-6 ${className}`} data-testid="adslot-placeholder">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Advertisement</p>
          <div className="border border-dashed border-gray-300 rounded-md bg-gray-50/60 p-6 text-center text-xs text-gray-400">
            AdSense slot ({slot || "—"}) — set REACT_APP_ADSENSE_CLIENT in .env
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`my-6 ${className}`} data-testid="adslot">
      {label && (
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Advertisement</p>
      )}
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        {...(layout ? { "data-ad-layout-key": layout } : {})}
        data-full-width-responsive="true"
      />
    </div>
  );
}
