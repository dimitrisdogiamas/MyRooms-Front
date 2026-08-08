import { AuthProvider, useAuth } from "@/context/AuthProvider";
import { SettingsProvider } from "@/context/SettingsProvider";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useResolvedScheme } from "@/hooks/use-resolved-scheme";
import { registerForPushNotifications } from "@/lib/notification";
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const scheme = useResolvedScheme();
  const { session, loading } = useAuth();
  const brandBg = scheme === "dark" ? "#141c1b" : "#f7f1ea";

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

  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AnimatedSplashOverlay />
      <Stack>
        {session ? (
          <>
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
          </>
        ) : (
          <Stack.Screen name="login" options={{ headerShown: false }} />
        )}
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
