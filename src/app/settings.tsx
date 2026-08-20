import { type BrandColors } from "@/constants/theme";
import { fontOptions, fs } from "@/lib/typography";
import { useMemo } from "react";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { DismissKeyboard } from "@/components/DismissKeyboard";
import * as LocalAuthentication from "expo-local-authentication";
import { Alert, Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "@/context/AuthProvider";
import { exportAllData, importData } from "@/lib/dataTransfer";

export default function SettingsScreen() {
  const { settings, setSettings, saveSettings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand, settings.compactMode),
    [settings.fontScale, settings.compactMode, brand],
  );
  const {signOut, session} = useAuth();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <DismissKeyboard style={styles.inner}>
        <Text style={styles.pageTitle}>Ρυθμίσεις</Text>

        <View style={styles.card}>
          <Text style={styles.cardHeading}>Εμφάνιση Εφαρμογής</Text>
          <View style={styles.optionsColumn}>
            {(["light", "dark", "system"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => setSettings({ ...settings, theme: t })}
                style={[
                  styles.optionButton,
                  settings.theme === t && styles.optionButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    settings.theme === t && styles.optionButtonTextActive,
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
          <Text style={styles.cardHeading}>Μέγεθος Κειμένου</Text>
          <View style={styles.optionsColumn}>
            {fontOptions.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() =>
                  setSettings({ ...settings, fontScale: opt.value })
                }
                style={[
                  styles.optionButton,
                  settings.fontScale === opt.value && styles.optionButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.optionButtonText,
                    settings.fontScale === opt.value &&
                      styles.optionButtonTextActive,
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
          <Text style={styles.rowLabel}>Ξεκλείδωμα Με Βιομετρικά</Text>
          <Switch
            value={settings.biometricLock}
              onValueChange={async (value) => {
              if (!value) {
                setSettings({ ...settings, biometricLock: value })
                return;
              }


                // does hardware exist
                const hasHardware = await LocalAuthentication.hasHardwareAsync();
                if (!hasHardware) {
                  Alert.alert("Error", "No hardware found");
                  return;
                }

                // does biometric authentication exist
                const hasBiometric = await LocalAuthentication.isEnrolledAsync();
                if (!hasBiometric) {
                  Alert.alert("Error", "No biometric authentication found");
                  return;
                }

                // 3(Prompt)
                const result = await LocalAuthentication.authenticateAsync({
                  promptMessage: "Ενεργοποιήση βιομετρικού Ξεκλειδώματος",
                  cancelLabel: "Ακύρωση",
                });

                if (result.success) {
                  setSettings({ ...settings, biometricLock: true });
                }
              }}
            trackColor={{ true: brand.primary, false: brand.sandDeep }}
            />
            </View>

        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Ειδοποίηση άφιξης</Text>
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
            <Text style={styles.rowLabel}>Ειδοποίηση αναχώρησης</Text>
            <Switch
              value={settings.notifyDeparture}
              onValueChange={(value) =>
                setSettings({ ...settings, notifyDeparture: value })
              }
              trackColor={{ true: brand.primary, false: brand.sandDeep }}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Συμπαγής εμφάνιση</Text>
            <Switch
              value={settings.compactMode}
              onValueChange={(value) =>
                setSettings({ ...settings, compactMode: value })
              }
              trackColor={{ true: brand.primary, false: brand.sandDeep }}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Κρατήσεις</Text>
        <View style={styles.card}>
          <Text style={styles.cardHeading}>Ελάχιστες Διανυκτερεύσεις</Text>
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
            textAlign="center"
          />
        </View>
        <Pressable
          style={styles.saveButton}
          onPress={() => {
            void saveSettings();
          }}
        >
          <Text style={styles.saveButtonText}>Αποθήκευση</Text>
        </Pressable>

        <Pressable
          style={styles.logoutButton}
          onPress={async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert(
                "Error",
                error instanceof Error ? error.message : "Failed to logout",
              );
            }
          }}
        >
          <Text style={styles.saveButtonText}>Αποσύνδεση</Text>
        </Pressable>

        <Text style={styles.sectionTitle}>Δεδομένα</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.dataBtn}
            onPress={async () => {
              try {
                await exportAllData();
              } catch (err) {
                Alert.alert("Σφάλμα", err instanceof Error ? err.message : "Αποτυχία εξαγωγής");
              }
            }}
          >
            <Text style={styles.dataBtnText}>📤 Εξαγωγή δεδομένων</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable
            style={styles.dataBtn}
            onPress={async () => {
              try {
                await importData();
              } catch (err) {
                Alert.alert("Σφάλμα", err instanceof Error ? err.message : "Αποτυχία εισαγωγής");
              }
            }}
          >
            <Text style={styles.dataBtnText}>📥 Εισαγωγή δεδομένων</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>Σχετικά</Text>
        <View style={styles.card}>
          <Text style={styles.meta}>my-rooms · v1.0.0</Text>
        </View>
      </DismissKeyboard>
    </ScrollView>
  );
}

function createStyles(scale: number, brand: BrandColors, compactMode: boolean) {
  const s = (n: number) => fs(n, scale);
  const pad = compactMode ? 12 : 20;
  const gap = compactMode ? 10 : 14;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: brand.sand,
    },
    content: {
      flexGrow: 1,
      paddingVertical: compactMode ? 16 : 28,
      paddingHorizontal: pad,
      alignItems: "center",
    },
    inner: {
      width: "100%",
      maxWidth: 440,
      gap,
    },
    pageTitle: {
      fontSize: s(26),
      fontWeight: "700",
      color: brand.ink,
      textAlign: "center",
      marginBottom: compactMode ? 4 : 8,
    },
    sectionTitle: {
      marginTop: compactMode ? 8 : 10,
      marginBottom: 2,
      fontSize: s(12),
      fontWeight: "700",
      color: brand.primary,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      textAlign: "center",
    },
    card: {
      backgroundColor: brand.white,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      padding: compactMode ? 14 : 18,
      gap: 0,
    },
    optionsColumn: {
      flexDirection: "row",
      flexWrap: "nowrap",
      gap: compactMode ? 8 : 10,
      marginTop: compactMode ? 14 : 18,
    },
    optionButton: {
      flex: 1,
      minWidth: 0,
      paddingVertical: compactMode ? 10 : 12,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      alignItems: "center",
      justifyContent: "center",
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      minHeight: 36,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: brand.sandDeep,
      marginVertical: compactMode ? 8 : 10,
    },
    cardHeading: {
      fontSize: s(15),
      color: brand.ink,
      fontWeight: "700",
      textAlign: "center",
      width: "100%",
    },
    rowLabel: {
      flex: 1,
      fontSize: s(15),
      color: brand.ink,
      fontWeight: "600",
      textAlign: "left",
    },
    input: {
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: compactMode ? 10 : 12,
      fontSize: s(15),
      color: brand.ink,
      backgroundColor: brand.sand,
      marginTop: compactMode ? 14 : 18,
    },
    meta: {
      fontSize: s(14),
      color: brand.claySoft,
      textAlign: "center",
    },
    saveButton: {
      marginTop: compactMode ? 8 : 12,
      backgroundColor: brand.primary,
      borderRadius: 12,
      paddingVertical: compactMode ? 12 : 16,
      alignItems: "center",
    },
    saveButtonText: {
      color: brand.onAccent,
      fontWeight: "700",
      fontSize: s(16),
    },
    optionButtonText: {
      fontSize: s(13),
      color: brand.ink,
      fontWeight: "600",
      textAlign: "center",
    },
    optionButtonTextActive: {
      color: brand.onAccent,
    },
    optionButtonActive: {
      backgroundColor: brand.primary,
      borderColor: brand.primary,
    },
    logoutButton: {
      marginTop: compactMode ? 12 : 20,
      width: "100%",
      backgroundColor: brand.primary,
      borderRadius: 12,
      paddingVertical: compactMode ? 10 : 14,
      alignItems: "center",
    },
    logoutButtonText: {
      color: brand.onAccent,
      fontWeight: "700",
      fontSize: s(16),
    },
    dataBtn: {
      paddingVertical: compactMode ? 12 : 14,
      alignItems: "center",
    },
    dataBtnText: {
      fontSize: s(15),
      fontWeight: "600",
      color: brand.primary,
    },
  });
}
