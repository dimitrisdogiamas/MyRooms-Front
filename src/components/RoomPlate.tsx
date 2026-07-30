import { Brand } from "@/constants/theme";
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

const styles = StyleSheet.create({
  plate: {
    minWidth: 72,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Brand.sand,
    borderWidth: 1.5,
    borderColor: Brand.primary,
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
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  screwLeft: {
    position: "absolute",
    left: 6,
    top: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.claySoft,
    opacity: 0.55,
  },
  screwRight: {
    position: "absolute",
    right: 6,
    top: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Brand.claySoft,
    opacity: 0.55,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: Brand.ink,
    letterSpacing: 0.5,
  },
  labelCompact: {
    fontSize: 13,
  },
  labelActive: {
    color: Brand.white,
  },
});
