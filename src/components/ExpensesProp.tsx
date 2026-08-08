import { Fonts, type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import {
  getExpensesTotal,
  getPropertyExpenses,
  type Expense,
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
  View,
} from "react-native";

type ExpensesPropProps = {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName?: string;
};

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !propertyId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getPropertyExpenses(propertyId)
      .then((data) => {
        if (!cancelled) setExpenses(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setExpenses([]);
          setError(err instanceof Error ? err.message : "Αποτυχία φόρτωσης");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [visible, propertyId]);

  const total = getExpensesTotal(expenses);

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
          </View>

          {loading ? (
            <ActivityIndicator color={brand.calendarBlue} style={styles.loader} />
          ) : error ? (
            <Text style={styles.empty}>{error}</Text>
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
                      <Text style={styles.expenseMeta}>{expense.category}</Text>
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
  const surface = "#1c2624";
  const idle = "#2a3533";

  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      padding: 16,
    },
    panel: {
      backgroundColor: surface,
      borderRadius: 24,
      padding: 18,
      maxHeight: "90%",
      gap: 12,
    },
    title: {
      fontSize: s(24),
      fontWeight: "700",
      color: "#f2ebe3",
      fontFamily: Fonts?.serif,
      textAlign: "center",
    },
    subtitle: {
      fontSize: s(15),
      color: "#9aa9a8",
      textAlign: "center",
      marginTop: -6,
    },
    totalsCard: {
      backgroundColor: "#dfece8",
      borderRadius: 16,
      padding: 16,
      gap: 4,
    },
    totalsTitle: {
      fontSize: s(14),
      fontWeight: "700",
      color: "#1f2a28",
    },
    totalsValue: {
      fontSize: s(22),
      fontWeight: "700",
      color: brand.calendarBlue,
    },
    loader: {
      marginVertical: 24,
    },
    empty: {
      fontSize: s(14),
      color: "#9aa9a8",
      textAlign: "center",
      paddingVertical: 20,
    },
    list: {
      maxHeight: 320,
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
      borderBottomColor: idle,
      gap: 12,
    },
    expenseLeft: {
      flex: 1,
      gap: 2,
    },
    expenseDate: {
      fontSize: s(14),
      fontWeight: "600",
      color: "#f2ebe3",
    },
    expenseMeta: {
      fontSize: s(12),
      color: "#9aa9a8",
    },
    expenseAmount: {
      fontSize: s(15),
      fontWeight: "700",
      color: brand.calendarBlue,
    },
    closeBtn: {
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.35)",
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    closeText: {
      color: "#f2ebe3",
      fontWeight: "700",
      fontSize: s(15),
    },
  });
}
