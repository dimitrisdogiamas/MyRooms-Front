import { useState, useMemo } from "react";
import { router } from "expo-router";
import { useAuth } from "@/context/AuthProvider";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { fs } from "@/lib/typography";
import { SafeAreaView } from "react-native-safe-area-context";
import { DismissKeyboard } from "@/components/DismissKeyboard";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  View,
  StyleSheet,
  Pressable,

} from "react-native";
import { type BrandColors } from "@/constants/theme";

export default function Register() {
  const { settings } = useSettings();
  const { register } = useAuth();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit() {

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      Alert.alert("Σφάλμα", "Παρακαλώ συμπληρώστε όλα τα πεδία.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Σφάλμα", "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.");
      return;
    }

    try {
      setBusy(true);
      const needConfirmation = await register(trimmedEmail, password);
      if (needConfirmation) {
        Alert.alert(
          "Έλεγξε το email σου",
          "Στείλαμε μήνυμα επιβεβαίωσης στη διεύθυνσή σου.",
          [
            {
              text: "OK",
              onPress: () => router.replace("/login"),
            },
          ],
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Αποτυχία εγγραφής.";
      Alert.alert("Σφάλμα εγγραφής", message);
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
          <Text style={styles.title}>Register to my-accomondations</Text>

          <View style={styles.card}>
            <Text style={styles.subtitle}>Εγγραφή στον λογαριασμό σου</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={brand.claySoft}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              editable={!busy}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={brand.claySoft}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              editable={!busy}

            />
            <Pressable
              style={styles.button}
              disabled={busy}
              onPress={onSubmit}
            >
              <Text style={styles.buttonText}>
                {busy ? "Περιμένετε..." : "Εγγραφή"}
              </Text>
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
      color: brand.onAccent,
      fontWeight: "700",
      fontSize: s(16),
    },
  });
}
