import { useCallback } from "react";
import { useSettings } from "@/context/SettingsProvider";

export const fontOptions = [
  { label: "Μικρό", value: 1 },
  { label: "Μεσαίο", value: 1.2 },
  { label: "Μεγάλο", value: 1.4 },
] as const;

export function fs(base: number, scale: number) {
  return Math.round(base * scale);
}

/** Scaled fontSize helper from settings.fontScale */
export function useFs() {
  const { settings } = useSettings();
  return useCallback(
    (base: number) => fs(base, settings.fontScale),
    [settings.fontScale],
  );
}
