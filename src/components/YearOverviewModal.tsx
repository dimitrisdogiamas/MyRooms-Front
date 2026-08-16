import { Fonts, type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { fs } from "@/lib/typography";
import type { RoomYearStats, YearOverview } from "@/lib/yearOverview";
import { useMemo } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MONTH_LABELS = [
  "Ιαν",
  "Φεβ",
  "Μάρ",
  "Απρ",
  "Μάι",
  "Ιούν",
  "Ιούλ",
  "Αύγ",
  "Σεπ",
  "Οκτ",
  "Νοέ",
  "Δεκ",
];

type YearOverviewModalProps = {
  visible: boolean;
  overview: YearOverview | null;
  propertyName: string;
  onClose: () => void;
};

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function MonthGrid({
  year,
  monthIndex,
  occupiedSet,
  styles,
  brand,
}: {
  year: number;
  monthIndex: number;
  occupiedSet: Set<string>;
  styles: ReturnType<typeof createStyles>;
  brand: BrandColors;
}) {
  const count = daysInMonth(year, monthIndex);
  const cells = [];
  for (let day = 1; day <= count; day++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const occupied = occupiedSet.has(iso);
    cells.push(
      <View
        key={iso}
        style={[
          styles.dayDot,
          occupied
            ? { backgroundColor: brand.calendarBlue }
            : styles.dayDotIdle,
        ]}
      />,
    );
  }

  return (
    <View style={styles.monthBlock}>
      <Text style={styles.monthLabel}>{MONTH_LABELS[monthIndex]}</Text>
      <View style={styles.monthGrid}>{cells}</View>
    </View>
  );
}

function RoomSection({
  room,
  year,
  styles,
  brand,
}: {
  room: RoomYearStats;
  year: number;
  styles: ReturnType<typeof createStyles>;
  brand: BrandColors;
}) {
  const occupiedSet = useMemo(
    () => new Set(room.occupiedDates),
    [room.occupiedDates],
  );

  return (
    <View style={styles.roomSection}>
      <Text style={styles.roomName}>{room.roomName}</Text>
      <View style={styles.statsRow}>
        {/* <View style={styles.statItem}>
          <Text style={styles.statLabel}>Κρατήσεις</Text>
          <Text style={styles.statValue}>{room.bookingsCount}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ημέρες γεμάτο</Text>
          <Text style={styles.statValue}>{room.occupiedNights}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Έσοδα</Text>
          <Text style={styles.statValue}>{room.income.toFixed(2)}€</Text>
        </View> */}
      </View>
      <View style={styles.monthsWrap}>
        {MONTH_LABELS.map((_, monthIndex) => (
          <MonthGrid
            key={monthIndex}
            year={year}
            monthIndex={monthIndex}
            occupiedSet={occupiedSet}
            styles={styles}
            brand={brand}
          />
        ))}
      </View>
    </View>
  );
}

export function YearOverviewModal({
  visible,
  overview,
  propertyName,
  onClose,
}: YearOverviewModalProps) {
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  if (!overview) return null;

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
            <Text style={styles.title}>
              Ετήσια επισκόπηση {overview.year}
            </Text>
            <Text style={styles.subtitle}>{propertyName}</Text>

            <View style={styles.totalsCard}>
              <Text style={styles.totalsTitle}>Σύνολο</Text>
              <View style={styles.linesBlock}>
                <Text style={styles.line}>
                  Άτομα:{" "}
                  <Text style={styles.adultsCount}>
                    {overview.totals.adults}
                  </Text>
                  {" + "}
                  <Text style={styles.childrenCount}>
                    {overview.totals.children}
                  </Text>
                </Text>


                <Text style={styles.line}>
                  Κρατήσεις: {overview.totals.bookings}
                </Text>

                <Text style={styles.line}>
                  Ημέρες Πληρότητας: {overview.totals.occupiedNights}
                </Text>


                <Text style={styles.incomeLine}>
                  Έσοδα: {overview.totals.revenue.toFixed(2)}€
                </Text>

                <Text style={styles.expenseLine}>
                  Έξοδα: {overview.totals.expenses.toFixed(2)}€
                </Text>
              </View>
            </View>

            {overview.rooms.map((room) => (
              <RoomSection
                key={room.roomId}
                room={room}
                year={overview.year}
                styles={styles}
                brand={brand}
              />
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
      backgroundColor: brand.overlay,
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
    },
    title: {
      fontSize: s(26),
      fontWeight: "700",
      color: brand.ink,
      fontFamily: Fonts?.serif,
      textAlign: "center",
    },
    subtitle: {
      fontSize: s(15),
      color: brand.claySoft,
      textAlign: "center",
      marginTop: -8,
    },
    roomSection: {
      gap: 10,
    },
    roomName: {
      textAlign: "center",
      fontSize: s(16),
      fontWeight: "700",
      color: brand.ink,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    statItem: {
      flex: 1,
      backgroundColor: brand.sand,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: "center",
      borderWidth: 1,
      borderColor: brand.sandDeep,
    },
    statLabel: {
      fontSize: s(11),
      color: brand.claySoft,
      marginBottom: 4,
      textAlign: "center",
    },
    statValue: {
      fontSize: s(15),
      fontWeight: "700",
      color: brand.ink,
    },
    monthsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between",
    },
    monthBlock: {
      width: "30%",
      gap: 4,
    },
    monthLabel: {
      fontSize: s(11),
      color: brand.claySoft,
      textAlign: "center",
    },
    monthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 2,
    },
    dayDot: {
      width: 8,
      height: 8,
      borderRadius: 2,
    },
    dayDotIdle: {
      backgroundColor: brand.sandDeep,
    },
    totalsCard: {
      backgroundColor: brand.sandDeep,
      borderRadius: 16,
      padding: 16,
      gap: 6,
      alignItems: "center",
    },
    totalsTitle: {
      fontSize: s(16),
      fontWeight: "700",
      color: brand.ink,
      marginBottom: 4,
      textAlign: "center",
    },
    linesBlock: {
      gap: 6,
      alignItems: "center",
      width: "100%",
    },
    line: {
      fontSize: s(14),
      color: brand.ink,
      textAlign: "center",
    },
    adultsCount: {
      color: brand.primary,
      fontWeight: "700",
    },
    childrenCount: {
      color: brand.danger,
      fontWeight: "700",
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
