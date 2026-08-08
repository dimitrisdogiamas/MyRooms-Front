import { Fonts, type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import {
  getPropertyOverview,
  type PropertyOverview,
} from "@/lib/propertyOverview";
import type { Booking } from "@/components/BookingsList";
import type { Room } from "@/components/RoomsSelector";
import type { RoomPricing } from "@/lib/roomPricing";
import { fs } from "@/lib/typography";
import { useMemo } from "react";
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
  propertyName: string;
  bookings: Booking[];
  rooms: Room[];
  roomPrices: RoomPricing[];
  onClose: () => void;
};

export function PropertyOverviewModal({
  visible,
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

  const overview: PropertyOverview = useMemo(
    () => getPropertyOverview(bookings, rooms, roomPrices),
    [bookings, rooms, roomPrices],
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
            <Text style={styles.title}>Επισκόπηση ιδιοκτησίας</Text>
            <Text style={styles.subtitle}>{propertyName}</Text>

            <View style={styles.totalsCard}>
              <Text style={styles.totalsTitle}>Σύνολο</Text>
              <Text style={styles.totalsLine}>
                Άτομα (μοναδικά): {overview.totals.guests}
              </Text>
              <Text style={styles.totalsLine}>
                Κρατήσεις: {overview.totals.bookings}
              </Text>
              <Text style={styles.totalsLine}>
                Διανυκτερεύσεις: {overview.totals.occupiedNights}
              </Text>
              <Text style={styles.totalsIncome}>
                Έσοδα: {overview.totals.revenue.toFixed(2)}€
              </Text>
            </View>

            {overview.years.map((year) => (
              <View key={year.year} style={styles.yearCard}>
                <Text style={styles.yearTitle}>{year.year}</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Άτομα</Text>
                    <Text style={styles.statValue}>{year.guests}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Κρατήσεις</Text>
                    <Text style={styles.statValue}>{year.bookings}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Νύχτες</Text>
                    <Text style={styles.statValue}>{year.occupiedNights}</Text>
                  </View>
                </View>
                <Text style={styles.yearRevenue}>
                  Έσοδα: {year.revenue.toFixed(2)}€
                </Text>
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
      gap: 14,
      paddingBottom: 8,
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
      gap: 6,
    },
    totalsTitle: {
      fontSize: s(16),
      fontWeight: "700",
      color: brand.ink,
      marginBottom: 4,
    },
    totalsLine: {
      fontSize: s(14),
      color: brand.ink,
    },
    totalsIncome: {
      fontSize: s(15),
      fontWeight: "700",
      color: brand.primary,
      marginTop: 4,
    },
    yearCard: {
      backgroundColor: brand.sand,
      borderRadius: 14,
      padding: 14,
      gap: 10,
      borderWidth: 1,
      borderColor: brand.sandDeep,
    },
    yearTitle: {
      fontSize: s(18),
      fontWeight: "700",
      color: brand.ink,
    },
    statsRow: {
      flexDirection: "row",
      gap: 8,
    },
    statItem: {
      flex: 1,
      backgroundColor: brand.white,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      borderWidth: 1,
      borderColor: brand.sandDeep,
    },
    statLabel: {
      fontSize: s(11),
      color: brand.claySoft,
      marginBottom: 4,
    },
    statValue: {
      fontSize: s(15),
      fontWeight: "700",
      color: brand.ink,
    },
    yearRevenue: {
      fontSize: s(14),
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
