import { type BrandColors } from "@/constants/theme";
import { fontOptions, fs } from "@/lib/typography";
import { useMemo } from "react";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SettingsScreen() {
  const { settings, setSettings, saveSettings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Ρυθμίσεις</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Εμφάνιση Εφαρμογής</Text>
        <View style={{ gap: 8 }}>
          {(["light", "dark", "system"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setSettings({ ...settings, theme: t })}
              style={[
                styles.themeButton,
                settings.theme === t && styles.themeButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.themeButtonText,
                  settings.theme === t && styles.themeButtonTextActive,
                ]}
              >
                {t === "light"
                  ? "Λευκό"
                  : t === "dark"
                    ? "Σκούρο"
                    : "Ίδιο με το σύστημα"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Μέγεθος Κειμένου</Text>
        <View style={{ gap: 8 }}>
          {fontOptions.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => setSettings({ ...settings, fontScale: opt.value })}
              style={[
                styles.fontScaleButton,
                settings.fontScale === opt.value && styles.fontScaleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.fontScaleButtonText,
                  settings.fontScale === opt.value &&
                    styles.fontScaleButtonTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Ειδοποίηση άφιξης</Text>
          <Switch
            value={settings.notifyArrival}
            onValueChange={(value) =>
              setSettings({ ...settings, notifyArrival: value })
            }
            trackColor={{ true: brand.primary, false: brand.sandDeep }}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Ειδοποίηση αναχώρησης</Text>
          <Switch
            value={settings.notifyDeparture}
            onValueChange={(value) =>
              setSettings({ ...settings, notifyDeparture: value })
            }
            trackColor={{ true: brand.primary, false: brand.sandDeep }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Κρατήσεις</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Ελάχιστες διανυκτερεύσεις</Text>
        <TextInput
          style={styles.input}
          value={String(settings.minNights)}
          onChangeText={(text) => {
            if (text === "") {
              setSettings({ ...settings, minNights: 1 });
              return;
            }
            const n = parseInt(text, 10);
            if (!Number.isNaN(n)) {
              setSettings({ ...settings, minNights: n });
            }
          }}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={brand.claySoft}
        />
      </View>

      <Text style={styles.sectionTitle}>Σχετικά</Text>
      <View style={styles.card}>
        <Text style={styles.meta}>my-rooms · v1.0.0</Text>
      </View>

      <Pressable
        style={styles.saveButton}
        onPress={() => {
          void saveSettings();
        }}
      >
        <Text style={styles.saveButtonText}>Αποθήκευση</Text>
      </Pressable>
    </ScrollView>
  );
}

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.sand,
  },
  content: {
    padding: 16,
    gap: 8,
    paddingBottom: 40,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: s(13),
    fontWeight: "700",
    color: brand.primary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: brand.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.sandDeep,
    padding: 14,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: brand.sandDeep,
  },
  label: {
    flex: 1,
    fontSize: s(15),
    color: brand.ink,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: brand.sandDeep,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: s(15),
    color: brand.ink,
    backgroundColor: brand.sand,
  },
  meta: {
    fontSize: s(14),
    color: brand.claySoft,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: brand.white,
    fontWeight: "700",
    fontSize: s(16),
  },
  themeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand.sandDeep,
  },
  themeButtonText: {
    fontSize: s(14),
    color: brand.ink,
    fontWeight: "600",
  },
  themeButtonTextActive: {
    color: brand.white,
  },
  themeButtonActive: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  fontScaleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: brand.sandDeep,
  },
  fontScaleButtonActive: {
    backgroundColor: brand.primary,
    borderColor: brand.primary,
  },
  fontScaleButtonText: {
    fontSize: s(14),
    color: brand.ink,
    fontWeight: "600",
  },
  fontScaleButtonTextActive: {
    color: brand.white,
  },
});
}

