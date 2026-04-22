import { useMemo } from "react";

/**
 * `true` when we're running on macOS (including iPadOS reporting itself as
 * Mac). We use this to pick the correct modifier-key hint.
 */
export function useIsMac(): boolean {
  return useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const nav = navigator as Navigator & {
      userAgentData?: { platform?: string };
    };
    const platform = nav.userAgentData?.platform ?? nav.platform ?? "";
    if (platform) return /mac|iphone|ipod|ipad/i.test(platform);
    return /mac|iphone|ipod|ipad/i.test(nav.userAgent ?? "");
  }, []);
}

/**
 * Returns a human-readable shortcut string with the primary modifier.
 * `modifierShortcut("K")` → `"⌘K"` on macOS, `"Ctrl+K"` on Windows/Linux.
 */
export function useModifierShortcut(key: string): string {
  const isMac = useIsMac();
  return isMac ? `⌘${key}` : `Ctrl+${key}`;
}
