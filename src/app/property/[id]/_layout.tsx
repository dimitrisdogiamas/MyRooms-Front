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
          // Avoid sheet swipe-dismiss stealing vertical scroll from the list
          presentation: "card",
          title: "Έξοδα",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
