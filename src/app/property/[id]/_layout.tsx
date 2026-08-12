import { Stack } from "expo-router";

export default function PropertyIdLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          presentation: "modal",
          title: "Κράτηση",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="expenses"
        options={{
          presentation: "modal",
          title: "Έξοδα",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
