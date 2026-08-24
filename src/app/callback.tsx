import { useEffect, useMemo, useState } from "react";
import { useBrand } from "@/hooks/use-brand";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { fs } from "@/lib/typography";
import { useSettings } from "@/context/SettingsProvider";
import { type BrandColors } from "@/constants/theme";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { createSessionFromUrl } from "@/lib/authSession";

export default function Callback() {
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );
  const url = Linking.useURL();
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    void (async () => {
      try {
        const result = await createSessionFromUrl(url);
        if (cancelled) return;
        if (result === "noop") {
          setHint(
            "Δεν βρέθηκαν στοιχεία σύνδεσης στο link (συχνό στο Android). Αν ήδη επιβεβαίωσες το email, συνδέσου κανονικά.",
          );
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Αποτυχία ολοκλήρωσης σύνδεσης.",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {error || hint ? (
          <>
            <Text style={error ? styles.error : styles.hint}>
              {error ?? hint}
            </Text>
            <Pressable
              style={styles.button}
              onPress={() => router.replace("/login")}
            >
              <Text style={styles.buttonText}>Μετάβαση στη σύνδεση</Text>
            </Pressable>
          </>
        ) : (
          <>
            <ActivityIndicator color={brand.primary} />
            <Text style={styles.text}>Ολοκλήρωση σύνδεσης…</Text>
          </>
        )}
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
      gap: 16,
    },
    text: {
      color: brand.ink,
      fontSize: s(18),
      fontWeight: "700",
      textAlign: "center",
    },
    hint: {
      color: brand.ink,
      fontSize: s(15),
      fontWeight: "600",
      textAlign: "center",
      lineHeight: s(22),
    },
    error: {
      color: brand.danger,
      fontSize: s(16),
      fontWeight: "600",
      textAlign: "center",
    },
    button: {
      marginTop: 8,
      backgroundColor: brand.primary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    buttonText: {
      color: brand.onAccent,
      fontWeight: "700",
      fontSize: s(15),
    },
  });
}
