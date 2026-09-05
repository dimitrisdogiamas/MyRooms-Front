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

export default function ForgotPassword() {

  const brand = useBrand();
  const { settings } = useSettings();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

// function to handle the forgot password form submission
  async function onSubmit() {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: 
        }
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : "Αποτυχία αποστολής email.";
      Alert.alert("Σφάλμα", message);
    }
  }




  // main code 
}


function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);
  
  return StyleSheet.create({
    


  });
}
