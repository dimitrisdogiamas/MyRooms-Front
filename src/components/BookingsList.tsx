import { supabase } from "@/lib/supabase";
import { ThemedText } from "./themed-text";
import { FlatList, View, Pressable, StyleSheet } from "react-native";
import type { Room } from "./RoomsSelector";
import { type BrandColors } from "@/constants/theme";
import { useMemo } from "react";
import { fs } from "@/lib/typography";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { addDays } from "@/lib/bookingInsights";
import {
  getBookingIncome,
  type RoomPricing,
} from "@/lib/roomPricing";

export type Booking = {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  guest_name?: string | null;
  /** Σημείωση αναχώρησης / πρόωρης εξόδου */
  departure_note?: string | null;
  adults?: number | null;
  children?: number | null;
};

export type BookingsListProps = {
  bookings: Booking[];
  loading: boolean;
  onCancelled: () => void;
  rooms: Room[];
  roomPrices?: RoomPricing[];
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

export const BookingsList = ({
  bookings,
  loading,
  onCancelled,
  rooms,
  roomPrices = [],
}: BookingsListProps) => {
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  const sortedBookings = useMemo(
    () =>
      [...bookings].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [bookings],
  );

  function getRoomName(roomId: string) {
    return rooms.find((room) => room.id === roomId)?.name ?? "—";
  }

  async function handleCancel(id: string) {
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      console.error("Error cancelling booking:", error);
    } else {
      onCancelled();
    }
  }

  if (loading) {
    return <ThemedText style={styles.muted}>Φόρτωση Κρατήσεων...</ThemedText>;
  }

  if (sortedBookings.length === 0) {
    return (
      <ThemedText style={styles.muted}>Δεν υπάρχουν κρατήσεις.</ThemedText>
    );
  }

  return (
    <FlatList
      data={sortedBookings}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => {
        const nights = countNights(item.start_date, item.end_date);
        const cost = getBookingIncome(item, roomPrices);
        const guest = item.guest_name?.trim() || "Χωρίς όνομα";
        const adults = item.adults ?? 0;
        const children = item.children ?? 0;
        const guestsLabel =
          adults > 0 || children > 0 ? ` (${adults}+${children})` : "";

        return (
          <View style={styles.card}>
            <ThemedText style={styles.guestName}>
              {guest}
              {guestsLabel}
            </ThemedText>
            <ThemedText style={styles.meta}>
              {getRoomName(item.room_id)} · {item.start_date} → {item.end_date}
            </ThemedText>
            <View style={styles.statsRow}>
              <ThemedText style={styles.stat}>
                {nights} {nights === 1 ? "διανυκτέρευση" : "διανυκτερεύσεις"}
              </ThemedText>
              <ThemedText style={styles.cost}>{cost.toFixed(2)}€</ThemedText>
            </View>
            <Pressable
              style={styles.cancelButton}
              onPress={() => handleCancel(item.id)}
            >
              <ThemedText style={styles.cancelText}>Ακύρωση</ThemedText>
            </Pressable>
          </View>
        );
      }}
    />
  );
};

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);
  return StyleSheet.create({
    muted: {
      color: brand.claySoft,
      fontSize: s(14),
    },
    card: {
      backgroundColor: brand.white,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      padding: 12,
      marginBottom: 10,
      gap: 6,
    },
    guestName: {
      fontWeight: "700",
      color: brand.ink,
      fontSize: s(16),
    },
    meta: {
      color: brand.claySoft,
      fontSize: s(13),
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 2,
    },
    stat: {
      color: brand.ink,
      fontSize: s(14),
      fontWeight: "600",
    },
    cost: {
      color: brand.primary,
      fontSize: s(15),
      fontWeight: "700",
    },
    cancelButton: {
      alignSelf: "flex-end",
      paddingVertical: 6,
      paddingHorizontal: 12,
      backgroundColor: brand.danger,
      borderRadius: 8,
      marginTop: 4,
    },
    cancelText: {
      color: brand.white,
      fontSize: s(13),
      fontWeight: "600",
    },
  });
}
