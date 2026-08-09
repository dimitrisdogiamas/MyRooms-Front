import { Fonts, type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import {
  getPropertyOverview,
  type PropertyOverview,
  type PropertyYearOverview,
} from "@/lib/propertyOverview";
import type { Booking } from "@/components/BookingsList";
import type { Room } from "@/components/RoomsSelector";
import type { RoomPricing } from "@/lib/roomPricing";
import {
  getPropertyExpenses,
  type Expense,
} from "@/lib/expenses";
import { fs } from "@/lib/typography";
import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type PropertyOverviewModalProps = {
  visible: boolean;
  propertyId: string;
  propertyName: string;
  bookings: Booking[];
  rooms: Room[];
  roomPrices: RoomPricing[];
  onClose: () => void;
};

function OverviewLines({
  data,
  styles,
}: {
  data: Pick<
    PropertyYearOverview,
    | "adults"
    | "children"
    | "bookings"
    | "pricedNights"
    | "zeroPriceNights"
    | "revenue"
    | "expenses"
  >;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.linesBlock}>
      <Text style={styles.line}>
        Άτομα: {data.adults} ενήλικες + {data.children} παιδιά
      </Text>
      <Text style={styles.line}>Κρατήσεις: {data.bookings}</Text>
      <Text style={styles.line}>
        Κοστολογημένες ημέρες κράτησης: {data.pricedNights}
      </Text>
      <Text style={styles.line}>
        Μηδενικές ημέρες κράτησης: {data.zeroPriceNights}
      </Text>
      <Text style={styles.incomeLine}>Έσοδα: {data.revenue.toFixed(2)}€</Text>
      <Text style={styles.expenseLine}>Έξοδα: {data.expenses.toFixed(2)}€</Text>
    </View>
  );
}

export function PropertyOverviewModal({
  visible,
  propertyId,
  propertyName,
  bookings,
  rooms,
  roomPrices,
  onClose,
}: PropertyOverviewModalProps) {
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    if (!visible || !propertyId) {
      setExpenses([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const rows = await getPropertyExpenses(propertyId);
        if (!cancelled) setExpenses(rows);
      } catch (err) {
        console.error("Error fetching expenses for overview:", err);
        if (!cancelled) setExpenses([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, propertyId]);

  const overview: PropertyOverview = useMemo(
    () => getPropertyOverview(bookings, rooms, roomPrices, expenses),
    [bookings, rooms, roomPrices, expenses],
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.headerBlock}>
              <Text style={styles.title}>Επισκόπηση όλων των ετών</Text>
              <Text style={styles.subtitle}>{propertyName}</Text>
            </View>

            <View style={styles.totalsCard}>
              <Text style={styles.totalsTitle}>Σύνολο</Text>
              <OverviewLines data={overview.totals} styles={styles} />
              <Text style={styles.netLine}>
                Καθαρά:{" "}
                {(overview.totals.revenue - overview.totals.expenses).toFixed(
                  2,
                )}
                €
              </Text>
            </View>

            {overview.years.map((year) => (
              <View key={year.year} style={styles.yearCard}>
                <Text style={styles.yearTitle}>{year.year}</Text>
                <OverviewLines data={year} styles={styles} />
              </View>
            ))}
          </ScrollView>

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
    scrollContent: {
      gap: 16,
      paddingBottom: 8,
      alignItems: "stretch",
    },
    headerBlock: {
      alignItems: "center",
      marginBottom: 4,
      gap: 6,
    },
    title: {
      fontSize: s(22),
      fontWeight: "700",
      color: brand.ink,
      fontFamily: Fonts?.serif,
      textAlign: "center",
      width: "100%",
    },
    subtitle: {
      fontSize: s(15),
      color: brand.claySoft,
      textAlign: "center",
    },
    totalsCard: {
      backgroundColor: brand.sandDeep,
      borderRadius: 16,
      padding: 16,
      gap: 0,
    },
    totalsTitle: {
      fontSize: s(16),
      fontWeight: "700",
      color: brand.ink,
      textAlign: "center",
      width: "100%",
    },
    yearCard: {
      backgroundColor: brand.sand,
      borderRadius: 14,
      padding: 14,
      gap: 0,
      borderWidth: 1,
      borderColor: brand.sandDeep,
    },
    yearTitle: {
      fontSize: s(18),
      fontWeight: "700",
      color: brand.ink,
      textAlign: "center",
      width: "100%",
      marginBottom: 10,
    },
    linesBlock: {
      marginTop: 10,
      gap: 6,
      alignItems: "center",
    },
    line: {
      fontSize: s(14),
      color: brand.ink,
      textAlign: "center",
    },
    incomeLine: {
      fontSize: s(15),
      fontWeight: "700",
      color: brand.primary,
      marginTop: 4,
      textAlign: "center",
    },
    expenseLine: {
      fontSize: s(14),
      fontWeight: "600",
      color: brand.danger,
      textAlign: "center",
    },
    netLine: {
      fontSize: s(14),
      fontWeight: "700",
      color: brand.ink,
      marginTop: 8,
      textAlign: "center",
    },
    closeBtn: {
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 8,
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
