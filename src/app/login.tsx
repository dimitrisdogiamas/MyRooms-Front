import { type BrandColors } from "@/constants/theme";
import { useAuth } from "@/context/AuthProvider";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { DismissKeyboard } from "@/components/DismissKeyboard";
import { fs } from "@/lib/typography";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  async function onSubmit() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      Alert.alert("Σφάλμα", "Συμπλήρωσε email και κωδικό.");
      return;
    }

    try {
      setBusy(true);
      await signIn(trimmedEmail, password);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Αποτυχία εισόδου.";
      Alert.alert("Σφάλμα εισόδου", message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <DismissKeyboard style={styles.container}>
          <Text style={styles.title}>my-rooms</Text>
          <Text style={styles.subtitle}>Σύνδεση στον λογαριασμό σου</Text>

          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="email@example.com"
              placeholderTextColor={brand.claySoft}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!busy}
            />

            <Text style={styles.label}>Κωδικός</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={brand.claySoft}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              editable={!busy}
              onSubmitEditing={() => void onSubmit()}
            />

            <Pressable
              style={[styles.button, busy && styles.buttonDisabled]}
              disabled={busy}
              onPress={() => void onSubmit()}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Είσοδος</Text>
              )}
            </Pressable>
          </View>
        </DismissKeyboard>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);

  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    safe: {
      flex: 1,
      backgroundColor: brand.sand,
    },
    container: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 12,
    },
    title: {
      fontSize: s(32),
      fontWeight: "700",
      color: brand.ink,
      textAlign: "center",
    },
    subtitle: {
      fontSize: s(15),
      color: brand.claySoft,
      textAlign: "center",
      marginBottom: 12,
    },
    card: {
      backgroundColor: brand.white,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      padding: 20,
      gap: 10,
    },
    label: {
      fontSize: s(13),
      fontWeight: "700",
      color: brand.ink,
      marginTop: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: s(15),
      color: brand.ink,
      backgroundColor: brand.sand,
    },
    button: {
      marginTop: 12,
      backgroundColor: brand.primary,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 50,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: s(16),
    },
  });
}
