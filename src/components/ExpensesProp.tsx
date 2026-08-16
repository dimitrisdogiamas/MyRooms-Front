import { Fonts, type BrandColors } from "@/constants/theme";
import { ScrollFriendlyTextInput } from "@/components/ScrollFriendlyTextInput";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import {
  EXPENSE_CATEGORIES,
  addPropertyExpense,
  getExpensesTotal,
  getPropertyExpenses,
  type Expense,
  type ExpenseCategory,
} from "@/lib/expenses";
import { fs } from "@/lib/typography";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";

type ExpensesPropProps = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName?: string;
};

function formatDisplayDate(iso: string): string {
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso;
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
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
  const [date, setDate] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("Άλλο");
  const [note, setNote] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const formY = useRef(0);
  const noteOffsetInForm = useRef(0);
  const amountOffsetInForm = useRef(0);

  function scrollToField(offsetInForm: number) {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, formY.current + offsetInForm - 24),
        animated: true,
      });
    }, 120);
  }

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
    setDate("");
    setCategory("Άλλο");
    setNote("");
    setDatePickerOpen(false);
  }, [visible, propertyId]);

  const total = getExpensesTotal(expenses);

  function openExpensesPage() {
    if (!propertyId) return;
    onClose();
    router.push(`/property/${propertyId}/expenses`);
  }

  async function handleAdd() {
    const value = Number(amount.replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      setError("Βάλε έγκυρο ποσό.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      setError("Επίλεξε ημερομηνία.");
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
      setDate("");
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
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.panel}>
          <Text style={styles.title}>Έξοδα</Text>
          {propertyName ? (
            <Text style={styles.subtitle}>{propertyName}</Text>
          ) : null}

          <ScrollView
            ref={scrollRef}
            style={styles.bodyScroll}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            onScrollBeginDrag={Keyboard.dismiss}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.stack}>
              <View style={styles.totalsCard}>
                <Text style={styles.totalsTitle}>Σύνολο</Text>
                <Text style={styles.totalsValue}>{total.toFixed(2)}€</Text>
              </View>

              {!adding ? (
                <Pressable
                  style={styles.addBtn}
                  onPress={() => setAdding(true)}
                >
                  <Text style={styles.addBtnText}>+ Νέο έξοδο</Text>
                </Pressable>
              ) : (
                <View
                  style={styles.form}
                  onLayout={(e) => {
                    formY.current = e.nativeEvent.layout.y;
                  }}
                >
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

                  <Text style={styles.formLabel}>Ημερομηνία</Text>
                  <View style={styles.dateRow}>
                    <Pressable
                      style={[styles.dateField, styles.dateFieldFlex]}
                      onPress={() => setDatePickerOpen(true)}
                    >
                      <Text
                        style={
                          date ? styles.dateValue : styles.datePlaceholder
                        }
                      >
                        {date ? formatDisplayDate(date) : "Επίλεξε ημερομηνία"}
                      </Text>
                      <Text style={styles.dateIcon}>📅</Text>
                    </Pressable>
                    {date ? (
                      <Pressable
                        style={styles.dateClearBtn}
                        onPress={() => setDate("")}
                        hitSlop={8}
                      >
                        <Text style={styles.dateClearText}>×</Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <Text style={styles.formLabel}>Είδος / σημείωση</Text>
                  <View
                    onLayout={(e) => {
                      noteOffsetInForm.current = e.nativeEvent.layout.y;
                    }}
                  >
                    <ScrollFriendlyTextInput
                      style={styles.input}
                      value={note}
                      onChangeText={setNote}
                      placeholder="π.χ. λογαριασμός ΔΕΗ"
                      placeholderTextColor={brand.claySoft}
                      onFocus={() => scrollToField(noteOffsetInForm.current)}
                    />
                  </View>

                  <Text style={styles.formLabel}>Ποσό (€)</Text>
                  <View
                    onLayout={(e) => {
                      amountOffsetInForm.current = e.nativeEvent.layout.y;
                    }}
                  >
                    <ScrollFriendlyTextInput
                      style={[styles.input, styles.inputCentered]}
                      value={amount}
                      onChangeText={setAmount}
                      placeholder="0.00"
                      placeholderTextColor={brand.claySoft}
                      keyboardType="decimal-pad"
                      onFocus={() => scrollToField(amountOffsetInForm.current)}
                    />
                  </View>

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
                <ActivityIndicator
                  color={brand.primary}
                  style={styles.loader}
                />
              ) : (
                <Pressable style={styles.viewAllBtn} onPress={openExpensesPage}>
                  <Text style={styles.viewAllBtnText}>
                    Αναλυτική ({expenses.length})
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Κλείσιμο</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={datePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerOpen(false)}
      >
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerPanel}>
            <Text style={styles.formLabel}>Ημερομηνία εξόδου</Text>
            <Calendar
              enableSwipeMonths
              markedDates={
                date
                  ? {
                      [date]: {
                        selected: true,
                        selectedColor: brand.primary,
                      },
                    }
                  : undefined
              }
              onDayPress={(day) => {
                setDate(day.dateString);
                setDatePickerOpen(false);
              }}
              theme={{
                todayTextColor: brand.primary,
                arrowColor: brand.primary,
                selectedDayBackgroundColor: brand.primary,
              }}
            />
            <View style={styles.pickerActions}>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => {
                  setDate("");
                  setDatePickerOpen(false);
                }}
              >
                <Text style={styles.secondaryBtnText}>Καθαρισμός</Text>
              </Pressable>
              <Pressable
                style={styles.secondaryBtn}
                onPress={() => setDatePickerOpen(false)}
              >
                <Text style={styles.secondaryBtnText}>Κλείσιμο</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
      padding: 14,
      maxHeight: "88%",
      width: "100%",
      maxWidth: 440,
      alignSelf: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: brand.sandDeep,
    },
    bodyScroll: {
      flexGrow: 0,
      flexShrink: 1,
    },
    bodyContent: {
      gap: 12,
      paddingBottom: 24,
    },
    stack: {
      gap: 12,
      marginBottom: 8,
    },
    title: {
      fontSize: s(20),
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
      borderRadius: 10,
      padding: 4,
      gap: 4,
      alignItems: "center",
    },
    totalsTitle: {
      textAlign: "center",
      fontSize: s(14),
      fontWeight: "700",
      color: brand.ink,
    },
    totalsValue: {
      fontSize: s(22),
      fontWeight: "700",
      color: brand.primary,
      textAlign: "center",
    },
    addBtn: {
      backgroundColor: brand.primary,
      borderRadius: 9,
      paddingVertical: 12,
      alignItems: "center",
    },
    addBtnText: {
      color: brand.onAccent,
      fontWeight: "700",
      fontSize: s(14),
    },
    form: {
      gap: 10,
      backgroundColor: brand.sand,
      borderRadius: 14,
      padding: 12,
      marginBottom: 4,
    },
    formLabel: {
      textAlign: "center",
      fontSize: s(13),
      fontWeight: "700",
      color: brand.ink,
      marginTop: 4,
    },
    categoryWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      justifyContent: "center",
    },
    categoryChip: {
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: brand.white,
      minWidth: 72,
      alignItems: "center",
    },
    categoryChipActive: {
      backgroundColor: brand.primary,
      borderColor: brand.primary,
    },
    categoryChipText: {
      fontSize: s(12),
      color: brand.ink,
      fontWeight: "600",
      textAlign: "center",
    },
    categoryChipTextActive: {
      color: brand.onAccent,
    },
    dateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dateField: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 9,
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: brand.white,
    },
    dateFieldFlex: {
      flex: 1,
    },
    dateClearBtn: {
      width: 40,
      height: 40,
      borderRadius: 9,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      backgroundColor: brand.white,
      alignItems: "center",
      justifyContent: "center",
    },
    dateClearText: {
      fontSize: s(22),
      lineHeight: s(24),
      color: brand.claySoft,
      fontWeight: "400",
    },
    dateValue: {
      fontSize: s(14),
      fontWeight: "600",
      color: brand.ink,
    },
    datePlaceholder: {
      fontSize: s(14),
      color: brand.claySoft,
    },
    dateIcon: {
      fontSize: s(16),
    },
    input: {
      textAlign: "center",
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 9,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: s(14),
      color: brand.ink,
      backgroundColor: brand.white,
    },
    inputCentered: {
      textAlign: "center",
      fontWeight: "700",
      fontSize: s(16),
    },
    formActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
      marginBottom: 4,
    },
    secondaryBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 9,
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
      borderRadius: 9,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryBtnText: {
      color: brand.onAccent,
      fontWeight: "700",
      fontSize: s(14),
    },
    loader: {
      marginVertical: 24,
    },
    errorText: {
      fontSize: s(13),
      color: brand.danger,
      textAlign: "center",
    },
    viewAllBtn: {
      borderWidth: 1,
      borderColor: brand.primary,
      borderRadius: 9,
      paddingVertical: 12,
      alignItems: "center",
      backgroundColor: brand.white,
      marginBottom: 2,
    },
    viewAllBtnText: {
      color: brand.primary,
      fontWeight: "700",
      fontSize: s(14),
    },
    closeBtn: {
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      marginTop: 4,
      marginBottom: 4,
    },
    closeText: {
      color: brand.ink,
      fontWeight: "700",
      fontSize: s(15),
    },
    pickerOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "center",
      padding: 16,
    },
    pickerPanel: {
      backgroundColor: brand.white,
      borderRadius: 16,
      padding: 16,
      gap: 12,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      maxWidth: 440,
      width: "100%",
      alignSelf: "center",
    },
    pickerActions: {
      flexDirection: "row",
      gap: 8,
    },
  });
}
