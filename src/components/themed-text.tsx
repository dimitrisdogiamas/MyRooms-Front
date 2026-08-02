import { Platform, Text, type TextProps } from "react-native";

import { Fonts, ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useFs } from "@/lib/typography";

export type ThemedTextProps = TextProps & {
  type?:
    | "default"
    | "title"
    | "small"
    | "smallBold"
    | "subtitle"
    | "link"
    | "linkPrimary"
    | "code";
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = "default",
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const s = useFs();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? "text"] },
        type === "default" && {
          fontSize: s(16),
          lineHeight: s(24),
          fontWeight: "500",
        },
        type === "title" && {
          fontSize: s(48),
          fontWeight: "600",
          lineHeight: s(52),
        },
        type === "small" && {
          fontSize: s(14),
          lineHeight: s(20),
          fontWeight: "500",
        },
        type === "smallBold" && {
          fontSize: s(14),
          lineHeight: s(20),
          fontWeight: "700",
        },
        type === "subtitle" && {
          fontSize: s(32),
          lineHeight: s(44),
          fontWeight: "600",
        },
        type === "link" && {
          lineHeight: s(30),
          fontSize: s(14),
        },
        type === "linkPrimary" && {
          lineHeight: s(30),
          fontSize: s(14),
          color: "#3c87f7",
        },
        type === "code" && {
          fontFamily: Fonts.mono,
          fontWeight: Platform.select({ android: "700" }) ?? "500",
          fontSize: s(12),
        },
        style,
      ]}
      {...rest}
    />
  );
}
