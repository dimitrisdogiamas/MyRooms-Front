import { Fonts, type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import {
  getExpensesTotal,
  getExpensesTotalByCategory,
  getPropertyExpenses,
  type Expense,
} from "@/lib/expenses";
import { supabase } from "@/lib/supabase";
import { fs } from "@/lib/typography";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatDisplayDate(iso: string): string {
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso;
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

export default function PropertyExpensesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const propertyId = Array.isArray(id) ? id[0] : (id ?? "");
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [propertyName, setPropertyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!propertyId) return;
    setError(null);
    try {
      const [rows, propertyRes] = await Promise.all([
        getPropertyExpenses(propertyId),
        supabase
          .from("properties")
          .select("name")
          .eq("id", propertyId)
          .maybeSingle(),
      ]);
      setExpenses(rows);
      if (propertyRes.data?.name) setPropertyName(propertyRes.data.name);
    } catch (err: unknown) {
      setExpenses([]);
      setError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης");
    }
  }, [propertyId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const total = getExpensesTotal(expenses);
  const byCategory = getExpensesTotalByCategory(expenses);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
      <Stack.Screen options={{ title: "Έξοδα", headerShown: true }} />

      <View style={styles.header}>
        <Text style={styles.title}>Καταχωρημένα έξοδα</Text>
        {propertyName ? (
          <Text style={styles.subtitle}>{propertyName}</Text>
        ) : null}
        <Text style={styles.total}>Σύνολο: {total.toFixed(2)}€</Text>
        {byCategory.length > 0 ? (
          <View style={styles.categoryTotals}>
            {byCategory.map((row) => (
              <Text key={row.category} style={styles.categoryLine}>
                {row.category}: {row.total.toFixed(2)}€
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={brand.primary} style={styles.loader} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Δεν υπάρχουν έξοδα ακόμα.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.date}>{formatDisplayDate(item.date)}</Text>
              {item.category ? (
                <Text style={styles.category}>{item.category}</Text>
              ) : null}
              <Text style={styles.amount}>
                {Number(item.amount).toFixed(2)}€
              </Text>
              {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: brand.sand,
    },
    header: {
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 4,
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: brand.sandDeep,
      backgroundColor: brand.white,
    },
    title: {
      fontSize: s(22),
      fontWeight: "700",
      color: brand.ink,
      fontFamily: Fonts?.serif,
      textAlign: "center",
    },
    subtitle: {
      fontSize: s(14),
      color: brand.claySoft,
      textAlign: "center",
    },
    total: {
      marginTop: 6,
      fontSize: s(16),
      fontWeight: "700",
      color: brand.primary,
    },
    categoryTotals: {
      marginTop: 4,
      gap: 2,
      alignItems: "center",
      marginBottom: 4,
    },
    categoryLine: {
      fontSize: s(12),
      color: brand.clay,
    },
    loader: {
      marginTop: 40,
    },
    error: {
      textAlign: "center",
      color: brand.danger,
      marginTop: 24,
      paddingHorizontal: 16,
    },
    empty: {
      textAlign: "center",
      color: brand.claySoft,
      marginTop: 40,
      fontSize: s(14),
    },
    list: {
      padding: 16,
      gap: 10,
      paddingBottom: 40,
    },
    card: {
      backgroundColor: brand.white,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      padding: 14,
      alignItems: "center",
      gap: 4,
      marginBottom: 10,
    },
    date: {
      fontSize: s(12),
      color: brand.claySoft,
      fontWeight: "600",
    },
    category: {
      fontSize: s(15),
      fontWeight: "700",
      color: brand.ink,
    },
    amount: {
      fontSize: s(18),
      fontWeight: "700",
      color: brand.primary,
    },
    note: {
      fontSize: s(13),
      color: brand.claySoft,
      textAlign: "center",
    },
  });
}
