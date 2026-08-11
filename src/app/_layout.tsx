import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { SettingsProvider } from "@/context/SettingsProvider";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useResolvedScheme } from "@/hooks/use-resolved-scheme";
import { useBrand } from "@/hooks/use-brand";
import { registerForPushNotifications } from "@/lib/notification";
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

SplashScreen.preventAutoHideAsync();

function LockScreen({
  brandBg,
  onUnlock,
}: {
  brandBg: string;
  onUnlock: () => void;
}) {
  const brand = useBrand();

  return (
    <View style={[styles.lockRoot, { backgroundColor: brandBg }]}>
      <Text style={[styles.lockTitle, { color: brand.ink }]}>my-rooms</Text>
      <Text style={[styles.lockSubtitle, { color: brand.claySoft }]}>
        Ξεκλείδωσε με βιομετρικά για να συνεχίσεις
      </Text>
      <Pressable
        style={[styles.lockButton, { backgroundColor: brand.primary }]}
        onPress={onUnlock}
      >
        <Text style={styles.lockButtonText}>Ξεκλείδωμα</Text>
      </Pressable>
    </View>
  );
}

function RootLayoutNav() {
  const scheme = useResolvedScheme();
  const { session, loading, unlocked, unlock } = useAuth();
  const brandBg = scheme === "dark" ? "#141c1b" : "#f7f1ea";

  useEffect(() => {
    if (session && !unlocked && !loading) {
      void unlock();
    }
  }, [session, unlocked, loading, unlock]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: brandBg,
        }}
      >
        <ActivityIndicator />
      </View>
    );
  }

  if (session && !unlocked) {
    return (
      <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <LockScreen brandBg={brandBg} onUnlock={() => void unlock()} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Protected guard={!!session && unlocked}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen
            name="property/[id]"
            options={{
              presentation: "modal",
              title: "Κράτηση",
              headerShown: true,
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              presentation: "modal",
              title: "Ρυθμίσεις",
              headerShown: true,
            }}
          />
        </Stack.Protected>

        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function TabLayout() {
  useEffect(() => {
    void registerForPushNotifications();
  }, []);

  return (
    <SettingsProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  lockRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },
  lockTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  lockSubtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 12,
  },
  lockButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    minWidth: 180,
    alignItems: "center",
  },
  lockButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
