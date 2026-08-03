import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { SettingsProvider } from "@/context/SettingsProvider";
import { useResolvedScheme } from "@/hooks/use-resolved-scheme";
// import { registerForPushNotifications } from "@/lib/notification";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const scheme = useResolvedScheme();

  return (
    <ThemeProvider value={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AnimatedSplashOverlay />
      <Stack>
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
      </Stack>
    </ThemeProvider>
  );
}

export default function TabLayout() {
  useEffect(() => {
    // void registerForPushNotifications();
  }, []);

  return (
    <SettingsProvider>
      <RootLayoutNav />
    </SettingsProvider>
  );
}
