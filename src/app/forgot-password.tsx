import { supabase } from "@/lib/supabase";
import { fs } from "@/lib/typography";
import { router } from "expo-router";
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
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { BrandColors } from "@/constants/theme";
import { DismissKeyboard } from "@/components/DismissKeyboard";

export default function ForgotPassword() {

  const brand = useBrand();
  const { settings } = useSettings();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );
  const [email, setEmail] = useState("");

// function to handle the forgot password form submission
  async function onSubmit() {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: "com.supabase://*"
        }
      )

      if (error) {
        throw error;
      }

      Alert.alert("Επιτυχία", "Ένα email με οδηγίες για την επαναφορά του κωδικού σας έχει αποσταλεί.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Αποτυχία αποστολής email.";
      Alert.alert("Σφάλμα", message);
    }
  }




  // main code 
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <DismissKeyboard style={styles.container}>
          <Text style={styles.title}>Ξεχάσατε τον κωδικό σας;</Text>   
          <Text style={styles.subtitle}>Συμπλήρωσε το email σου και θα στείλουμε οδηγίες για την επαναφορά του.</Text>



          <View style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Συμπλήρωσε το email σου"
              autoCapitalize="none"
              
            />

          </View>
        </DismissKeyboard>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
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
      fontSize: s(16),
      color: brand.claySoft,
      marginBottom: 12,
      textAlign: "center",
    }

  });
}
