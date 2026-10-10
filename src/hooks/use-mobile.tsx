import * as React from "react";

const MOBILE_BREAKPOINT = 768;

function detectMobile(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth < MOBILE_BREAKPOINT) return true;
  // Chrome "Desktop site" inflates window.innerWidth (~980px) on phones,
  // which would hide the mobile nav. screen.width keeps the real device
  // width in CSS px, so a coarse-pointer device with a small physical
  // screen is still treated as mobile.
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  return coarse && window.screen.width < MOBILE_BREAKPOINT;
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => setIsMobile(detectMobile());
    mql.addEventListener("change", onChange);
    setIsMobile(detectMobile());
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
