import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSettings } from "@/context/SettingsProvider";

export type ResolvedScheme = "light" | "dark";

/** Resolves settings.theme against the system scheme */
export function useResolvedScheme(): ResolvedScheme {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();

  if (settings.theme === "light" || settings.theme === "dark") {
    return settings.theme;
  }

  return systemScheme === "dark" ? "dark" : "light";
}
