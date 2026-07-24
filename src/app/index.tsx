import { Brand, Spacing } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "@/components/themed-text";

type Property = {
  id: string;
  name: string;
};

const PropertiesList = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchProperties = useCallback(async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .order("name", { ascending: true });
    if (error) {
      console.error(error);
      Alert.alert("Σφάλμα", "Αποτυχία φόρτωσης ιδιοκτησιών");
    } else {
      setProperties(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  async function addProperty() {
    const name = newName.trim();
    if (!name || saving) return;

    setSaving(true);
    const { error } = await supabase.from("properties").insert([{ name }]);
    setSaving(false);

    if (error) {
      console.error(error);
      Alert.alert("Σφάλμα", "Αποτυχία προσθήκης ιδιοκτησίας");
      return;
    }

    setNewName("");
    setAdding(false);
    setLoading(true);
    await fetchProperties();
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedText style={styles.muted}>Φόρτωση...</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.eyebrow}>Mel&Dim Resort</ThemedText>
          <ThemedText style={styles.title}>Ιδιοκτησίες</ThemedText>
        </View>
        <Pressable
          style={styles.addButton}
          onPress={() => setAdding((prev) => !prev)}
        >
          <ThemedText style={styles.addButtonText}>
            {adding ? "Κλείσιμο" : "+ Νέα"}
          </ThemedText>
        </Pressable>
      </View>

      {adding && (
        <View style={styles.addPanel}>
          <TextInput
            style={styles.input}
            placeholder="Όνομα ιδιοκτησίας"
            placeholderTextColor={Brand.claySoft}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <Pressable
            style={[styles.confirmButton, saving && styles.confirmDisabled]}
            onPress={addProperty}
            disabled={saving}
          >
            <ThemedText style={styles.confirmText}>
              {saving ? "Αποθήκευση..." : "Προσθήκη"}
            </ThemedText>
          </Pressable>
        </View>
      )}

      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <ThemedText style={styles.muted}>
            Δεν υπάρχουν ιδιοκτησίες ακόμα. Πρόσθεσε την πρώτη σου.
          </ThemedText>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/property/${item.id}`)}
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
            ]}
          >
            <ThemedText style={styles.cardText}>{item.name}</ThemedText>
            <ThemedText style={styles.cardHint}>Κρατήσεις →</ThemedText>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
};

export default PropertiesList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    backgroundColor: Brand.sand,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: Spacing.three,
  },
  eyebrow: {
    fontSize: 13,
    color: Brand.claySoft,
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Brand.ink,
  },
  addButton: {
    backgroundColor: Brand.gold,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  addButtonText: {
    color: Brand.white,
    fontWeight: "700",
    fontSize: 14,
  },
  addPanel: {
    backgroundColor: Brand.white,
    borderRadius: 14,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Brand.ink,
    backgroundColor: Brand.sand,
  },
  confirmButton: {
    backgroundColor: Brand.clay,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: Brand.white,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.four,
    backgroundColor: Brand.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardPressed: {
    backgroundColor: Brand.sandDeep,
  },
  cardText: {
    fontSize: 18,
    fontWeight: "600",
    color: Brand.clay,
  },
  cardHint: {
    fontSize: 13,
    color: Brand.claySoft,
  },
  muted: {
    color: Brand.claySoft,
    fontSize: 15,
  },
});
