import { BrandPalettes, type BrandColors } from "@/constants/theme";
import { useResolvedScheme } from "@/hooks/use-resolved-scheme";

/** Screen palette that follows settings theme (light / dark / system) */
export function useBrand(): BrandColors {
  const scheme = useResolvedScheme();
  return BrandPalettes[scheme];
}
