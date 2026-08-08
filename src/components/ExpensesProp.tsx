import { Fonts, type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import {
  EXPENSE_CATEGORIES,
  addPropertyExpense,
  getExpensesTotal,
  getExpensesTotalByCategory,
  getPropertyExpenses,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expenses";
import { fs } from "@/lib/typography";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type ExpensesPropProps = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName?: string;
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ExpensesProp({
  visible,
  onClose,
  propertyId,
  propertyName,
}: ExpensesPropProps) {
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [category, setCategory] = useState<ExpenseCategory>("Άλλο");
  const [note, setNote] = useState("");

  async function loadExpenses() {
    setLoading(true);
    setError(null);
    try {
      const data = await getPropertyExpenses(propertyId);
      setExpenses(data);
    } catch (err: unknown) {
      setExpenses([]);
      setError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!visible || !propertyId) return;
    void loadExpenses();
    setAdding(false);
    setAmount("");
    setDate(todayIso());
    setCategory("Άλλο");
    setNote("");
  }, [visible, propertyId]);

  const total = getExpensesTotal(expenses);
  const byCategory = getExpensesTotalByCategory(expenses);

  async function handleAdd() {
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Βάλε έγκυρο ποσό.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError("Ημερομηνία: YYYY-MM-DD");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await addPropertyExpense({
        property_id: propertyId,
        amount: value,
        date: date.trim(),
        category,
        note: note.trim() || null,
      });
      setAmount("");
      setNote("");
      setAdding(false);
      await loadExpenses();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Αποτυχία αποθήκευσης");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>Έξοδα</Text>
          {propertyName ? (
            <Text style={styles.subtitle}>{propertyName}</Text>
          ) : null}

          <View style={styles.totalsCard}>
            <Text style={styles.totalsTitle}>Σύνολο</Text>
            <Text style={styles.totalsValue}>{total.toFixed(2)}€</Text>
            {byCategory.length > 0 ? (
              <View style={styles.categoryTotals}>
                {byCategory.map((row) => (
                  <Text key={row.category} style={styles.categoryTotalLine}>
                    {row.category}: {row.total.toFixed(2)}€
                  </Text>
                ))}
              </View>
            ) : null}
          </View>

          {!adding ? (
            <Pressable style={styles.addBtn} onPress={() => setAdding(true)}>
              <Text style={styles.addBtnText}>+ Νέο έξοδο</Text>
            </Pressable>
          ) : (
            <View style={styles.form}>
              <Text style={styles.formLabel}>Κατηγορία</Text>
              <View style={styles.categoryWrap}>
                {EXPENSE_CATEGORIES.map((item) => (
                  <Pressable
                    key={item}
                    style={[
                      styles.categoryChip,
                      category === item && styles.categoryChipActive,
                    ]}
                    onPress={() => setCategory(item)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        category === item && styles.categoryChipTextActive,
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="Ποσό (€)"
                placeholderTextColor={brand.claySoft}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={brand.claySoft}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                value={note}
                onChangeText={setNote}
                placeholder="Σημείωση (προαιρετικό)"
                placeholderTextColor={brand.claySoft}
              />

              <View style={styles.formActions}>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => setAdding(false)}
                  disabled={saving}
                >
                  <Text style={styles.secondaryBtnText}>Ακύρωση</Text>
                </Pressable>
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => void handleAdd()}
                  disabled={saving}
                >
                  <Text style={styles.primaryBtnText}>
                    {saving ? "..." : "Αποθήκευση"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loading ? (
            <ActivityIndicator color={brand.primary} style={styles.loader} />
          ) : expenses.length === 0 ? (
            <Text style={styles.empty}>Δεν υπάρχουν έξοδα ακόμα.</Text>
          ) : (
            <ScrollView
              style={styles.list}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContent}
            >
              {expenses.map((expense) => (
                <View style={styles.expense} key={expense.id}>
                  <View style={styles.expenseLeft}>
                    <Text style={styles.expenseDate}>{expense.date}</Text>
                    {expense.category ? (
                      <Text style={styles.expenseCategory}>
                        {expense.category}
                      </Text>
                    ) : null}
                    {expense.note ? (
                      <Text style={styles.expenseMeta}>{expense.note}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.expenseAmount}>
                    {Number(expense.amount).toFixed(2)}€
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Κλείσιμο</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 16,
    },
    panel: {
      backgroundColor: brand.white,
      borderRadius: 24,
      padding: 18,
      maxHeight: "90%",
      gap: 12,
      borderWidth: 1,
      borderColor: brand.sandDeep,
    },
    title: {
      fontSize: s(24),
      fontWeight: "700",
      color: brand.ink,
      fontFamily: Fonts?.serif,
      textAlign: "center",
    },
    subtitle: {
      fontSize: s(15),
      color: brand.claySoft,
      textAlign: "center",
      marginTop: -6,
    },
    totalsCard: {
      backgroundColor: brand.sandDeep,
      borderRadius: 16,
      padding: 16,
      gap: 4,
    },
    totalsTitle: {
      fontSize: s(14),
      fontWeight: "700",
      color: brand.ink,
    },
    totalsValue: {
      fontSize: s(22),
      fontWeight: "700",
      color: brand.primary,
    },
    categoryTotals: {
      marginTop: 8,
      gap: 2,
    },
    categoryTotalLine: {
      fontSize: s(12),
      color: brand.clay,
    },
    addBtn: {
      backgroundColor: brand.primary,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    addBtnText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: s(14),
    },
    form: {
      gap: 8,
      backgroundColor: brand.sand,
      borderRadius: 14,
      padding: 12,
    },
    formLabel: {
      fontSize: s(13),
      fontWeight: "700",
      color: brand.ink,
    },
    categoryWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
    },
    categoryChip: {
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: brand.white,
    },
    categoryChipActive: {
      backgroundColor: brand.primary,
      borderColor: brand.primary,
    },
    categoryChipText: {
      fontSize: s(12),
      color: brand.ink,
      fontWeight: "600",
    },
    categoryChipTextActive: {
      color: "#ffffff",
    },
    input: {
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: s(14),
      color: brand.ink,
      backgroundColor: brand.white,
    },
    formActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    secondaryBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    secondaryBtnText: {
      color: brand.ink,
      fontWeight: "700",
      fontSize: s(14),
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: brand.primary,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryBtnText: {
      color: "#ffffff",
      fontWeight: "700",
      fontSize: s(14),
    },
    loader: {
      marginVertical: 24,
    },
    empty: {
      fontSize: s(14),
      color: brand.claySoft,
      textAlign: "center",
      paddingVertical: 20,
    },
    errorText: {
      fontSize: s(13),
      color: brand.danger,
      textAlign: "center",
    },
    list: {
      maxHeight: 260,
    },
    listContent: {
      gap: 0,
    },
    expense: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: brand.sandDeep,
      gap: 12,
    },
    expenseLeft: {
      flex: 1,
      gap: 2,
    },
    expenseDate: {
      fontSize: s(14),
      fontWeight: "600",
      color: brand.ink,
    },
    expenseCategory: {
      fontSize: s(12),
      fontWeight: "700",
      color: brand.primary,
    },
    expenseMeta: {
      fontSize: s(12),
      color: brand.claySoft,
    },
    expenseAmount: {
      fontSize: s(15),
      fontWeight: "700",
      color: brand.primary,
    },
    closeBtn: {
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    closeText: {
      color: brand.ink,
      fontWeight: "700",
      fontSize: s(15),
    },
  });
}
