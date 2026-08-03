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
        <View style={styles.statItem}>
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
        </View>
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

            {overview.rooms.map((room) => (
              <RoomSection
                key={room.roomId}
                room={room}
                year={overview.year}
                styles={styles}
                brand={brand}
              />
            ))}

            <View style={styles.totalsCard}>
              <Text style={styles.totalsTitle}>Σύνολο {propertyName}</Text>
              <Text style={styles.totalsLine}>
                Δωμάτια: {overview.totals.rooms}
              </Text>
              <Text style={styles.totalsLine}>
                Σύνολο κρατήσεων: {overview.totals.bookings}
              </Text>
              <Text style={styles.totalsLine}>
                Σύνολο κρατημένων ημερών: {overview.totals.occupiedNights}
              </Text>
              <Text style={styles.totalsIncome}>
                Σύνολο εσόδων: {overview.totals.income.toFixed(2)}€
              </Text>
            </View>
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
    scrollContent: {
      gap: 16,
      paddingBottom: 8,
    },
    title: {
      fontSize: s(26),
      fontWeight: "700",
      color: brand.white === "#ffffff" ? "#f2ebe3" : brand.ink,
      fontFamily: Fonts?.serif,
      textAlign: "center",
    },
    subtitle: {
      fontSize: s(15),
      color: "#9aa9a8",
      textAlign: "center",
      marginTop: -8,
    },
    roomSection: {
      gap: 10,
    },
    roomName: {
      fontSize: s(16),
      fontWeight: "700",
      color: "#f2ebe3",
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 8,
    },
    statItem: {
      flex: 1,
      backgroundColor: idle,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: "center",
    },
    statLabel: {
      fontSize: s(11),
      color: "#9aa9a8",
      marginBottom: 4,
      textAlign: "center",
    },
    statValue: {
      fontSize: s(15),
      fontWeight: "700",
      color: "#f2ebe3",
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
      color: "#9aa9a8",
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
      backgroundColor: idle,
    },
    totalsCard: {
      backgroundColor: "#dfece8",
      borderRadius: 16,
      padding: 16,
      gap: 6,
    },
    totalsTitle: {
      fontSize: s(16),
      fontWeight: "700",
      color: brand.ink === "#f2ebe3" ? "#1f2a28" : brand.ink,
      marginBottom: 4,
    },
    totalsLine: {
      fontSize: s(14),
      color: "#1f2a28",
    },
    totalsIncome: {
      fontSize: s(15),
      fontWeight: "700",
      color: brand.calendarBlue,
      marginTop: 4,
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
