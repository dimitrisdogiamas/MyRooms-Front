import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { AnimatedSplashOverlay } from '@/components/animated-icon';
// import { registerForPushNotifications } from '@/lib/notification';
import { useEffect } from 'react';
SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  useEffect(() => {
    // registerForPushNotifications();
  }, []);
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="property/[id]"
          options={{
            presentation: 'modal',
            title: 'Κράτηση',
            headerShown: true,
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
