import { type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { fs } from "@/lib/typography";
import { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

type RoomPlateProps = {
  label: string;
  active?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function RoomPlate({
  label,
  active = false,
  compact = false,
  style,
}: RoomPlateProps) {
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(() => createStyles(settings.fontScale, brand), [settings.fontScale, brand]);
  return (
    <View
      style={[
        styles.plate,
        compact && styles.plateCompact,
        active && styles.plateActive,
        style,
      ]}
    >
      <View style={styles.screwLeft} />
      <View style={styles.screwRight} />
      <Text
        style={[styles.label, compact && styles.labelCompact, active && styles.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);
  return StyleSheet.create({
  plate: {
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: brand.sand,
    borderWidth: 1.5,
    borderColor: brand.primary,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  plateCompact: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  plateActive: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  screwLeft: {
    position: "absolute",
    left: 6,
    top: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: brand.claySoft,
    opacity: 0.55,
  },
  screwRight: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: brand.claySoft,
    opacity: 0.55,
  },
  label: {
    fontSize: s(15),
    fontWeight: "700",
    color: brand.ink,
    letterSpacing: 0.5,
  },
  labelCompact: {
    fontSize: s(13),
  },
  labelActive: {
    color: brand.white,
  },
});
}

