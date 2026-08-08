import type { Booking } from "@/components/BookingsList";
import type { Room } from "@/components/RoomsSelector";
import { Fonts, type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { addDays } from "@/lib/bookingInsights";
import { getBookingIncome, type RoomPricing } from "@/lib/roomPricing";
import { fs } from "@/lib/typography";
import { useMemo } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type BookingInfoModalProps = {
  visible: boolean;
  onClose: () => void;
  booking: Booking;
  pressedDate: string;
  roomPrices: RoomPricing[];
  rooms?: Room[];
};

function countNights(start: string, end: string): number {
  let nights = 0;
  let current = start.slice(0, 10);
  const endDay = end.slice(0, 10);
  while (current < endDay) {
    nights += 1;
    current = addDays(current, 1);
  }
  return nights;
}

function formatDisplayDate(iso: string): string {
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso;
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

export function BookingInfoModal({
  visible,
  onClose,
  booking,
  pressedDate,
  roomPrices,
  rooms = [],
}: BookingInfoModalProps) {
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  const nights = countNights(booking.start_date, booking.end_date);
  const remaining = countNights(pressedDate, booking.end_date);
  const cost = getBookingIncome(booking, roomPrices);
  const roomName = rooms.find((r) => r.id === booking.room_id)?.name ?? null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>Κράτηση</Text>
          {roomName ? <Text style={styles.subtitle}>{roomName}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.line}>
              Ημέρα: {formatDisplayDate(pressedDate)}
            </Text>
            <Text style={styles.line}>
              Επισκέπτης: {booking.guest_name?.trim() || "—"}
            </Text>
            <Text style={styles.line}>
              Από {formatDisplayDate(booking.start_date)} έως{" "}
              {formatDisplayDate(booking.end_date)}
            </Text>
            <Text style={styles.line}>Διαμονή: {nights} διανυκτερεύσεις</Text>
            <Text style={styles.line}>
              Απομένουν: {remaining} διανυκτερεύσεις
            </Text>
            <Text style={styles.cost}>Κόστος: {cost.toFixed(2)}€</Text>
          </View>

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
    card: {
      backgroundColor: brand.sandDeep,
      borderRadius: 16,
      padding: 16,
      gap: 8,
    },
    line: {
      fontSize: s(14),
      color: brand.ink,
    },
    cost: {
      fontSize: s(16),
      fontWeight: "700",
      color: brand.primary,
      marginTop: 4,
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
