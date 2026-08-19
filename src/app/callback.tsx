import { useMemo } from "react";
import { useBrand } from "@/hooks/use-brand";
import { StyleSheet, Text, View } from "react-native";
import { fs } from "@/lib/typography";
import { useSettings } from "@/context/SettingsProvider";
import { type BrandColors } from "@/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Callback() {
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.text}>Ολοκλήρωση σύνδεσης…</Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: brand.sand,
    },
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    text: {
      color: brand.ink,
      fontSize: s(24),
      fontWeight: "700",
      textAlign: "center",
    },
  });
}
