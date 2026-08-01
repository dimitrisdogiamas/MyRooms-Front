import { Brand } from "@/constants/theme";
import { fontOptions } from "@/lib/typography";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";


type AppSettings = {
  theme: "light" | "dark"| "system";
  fontScale: number;
  notifyArrival: boolean;
  notifyDeparture: boolean;
  minNights: number;

}

export default function SettingsScreen() {
  const [notifyArrival, setNotifyArrival] = useState(true);
  const [notifyDeparture, setNotifyDeparture] = useState(true);
  const [minNights, setMinNights] = useState("1");
  const [theme, setTheme] = useState<AppSettings["theme"]>("system");
  const [fontScale, setFontScale] = useState<AppSettings["fontScale"]>(1);



  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionTitle}>Ρυθμίσεις</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Εμφάνιση Εφαρμογής</Text>
        <View>
          {(["light", "dark", "system"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTheme(t)} style={[styles.themeButton, theme === t && styles.themeButtonActive]} >
              <Text style={styles.themeButtonText}>{t === "light" ? "Λευκό" : t === "dark" ? "Σκούρο" : "Ίδιο με το σύστημα"}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.row}>
          Μέγεθος Κειμένου
        </Text>
        <View style={{ gap: 8 }}>
          {fontOptions.map((opt) => (
            <Pressable
              key={opt.label}
              onPress={() => setFontScale(opt.value)}
              style={[
                styles.fontScaleButton,
                fontScale === opt.value && styles.fontScaleButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.fontScaleButtonText,
                  fontScale === opt.value && styles.fontScaleButtonTextActive,
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
            value={notifyArrival}
            onValueChange={setNotifyArrival}
            trackColor={{ true: Brand.primary, false: Brand.sandDeep }}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.label}>Ειδοποίηση αναχώρησης</Text>
          <Switch
            value={notifyDeparture}
            onValueChange={setNotifyDeparture}
            trackColor={{ true: Brand.primary, false: Brand.sandDeep }}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>Κρατήσεις</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Ελάχιστες διανυκτερεύσεις</Text>
        <TextInput
          style={styles.input}
          value={minNights}
          onChangeText={setMinNights}
          keyboardType="number-pad"
          placeholder="1"
          placeholderTextColor={Brand.claySoft}
        />
      </View>

      <Text style={styles.sectionTitle}>Σχετικά</Text>
      <View style={styles.card}>
        <Text style={styles.meta}>my-rooms · v1.0.0</Text>
      </View>

      <Pressable style={styles.saveButton} onPress={() => {}}>
        <Text style={styles.saveButtonText}>Αποθήκευση</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.sand,
  },
  content: {
    padding: 16,
    gap: 8,
    paddingBottom: 40,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: "700",
    color: Brand.primary,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: Brand.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
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
    backgroundColor: Brand.sandDeep,
  },
  label: {
    flex: 1,
    fontSize: 15,
    color: Brand.ink,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Brand.ink,
    backgroundColor: Brand.sand,
  },
  meta: {
    fontSize: 14,
    color: Brand.claySoft,
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: Brand.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: Brand.white,
    fontWeight: "700",
    fontSize: 16,
  },
  themeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
  },
  themeButtonText: {
    fontSize: 14,
    color: Brand.ink,
    fontWeight: "600",
  },
  themeButtonActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  fontScaleButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
  },
  fontScaleButtonActive: {
    backgroundColor: Brand.primary,
    borderColor: Brand.primary,
  },
  fontScaleButtonText: {
    fontSize: 14,
    color: Brand.ink,
    fontWeight: "600",
  },
  fontScaleButtonTextActive: {
    color: Brand.white,
  },
});
