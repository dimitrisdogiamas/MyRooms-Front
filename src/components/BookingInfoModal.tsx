import type { Booking } from "@/components/BookingsList";
import type { Room } from "@/components/RoomsSelector";
import { Fonts, type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { addDays } from "@/lib/bookingInsights";
import { getBookingIncome, type RoomPricing } from "@/lib/roomPricing";
import { supabase } from "@/lib/supabase";
import { fs } from "@/lib/typography";
import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, StyleSheet, Text, View } from "react-native";

type BookingInfoModalProps = {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
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
  onChanged,
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

  const initialAdults = booking.adults ?? 2;
  const initialChildren = booking.children ?? 0;
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [savedAdults, setSavedAdults] = useState(initialAdults);
  const [savedChildren, setSavedChildren] = useState(initialChildren);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const nextAdults = booking.adults ?? 2;
    const nextChildren = booking.children ?? 0;
    setAdults(nextAdults);
    setChildren(nextChildren);
    setSavedAdults(nextAdults);
    setSavedChildren(nextChildren);
  }, [booking.id, booking.adults, booking.children]);

  const nights = countNights(booking.start_date, booking.end_date);
  const remaining = countNights(pressedDate, booking.end_date);
  const cost = getBookingIncome(booking, roomPrices);
  const roomName = rooms.find((r) => r.id === booking.room_id)?.name ?? null;
  const guestsDirty = adults !== savedAdults || children !== savedChildren;

  async function saveGuests() {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({ adults, children })
      .eq("id", booking.id);
    setSaving(false);

    if (error) {
      Alert.alert("Σφάλμα", "Αποτυχία ενημέρωσης ατόμων: " + error.message);
      return;
    }

    setSavedAdults(adults);
    setSavedChildren(children);
    onChanged?.();
  }

  function confirmDelete() {
    Alert.alert("Διαγραφή κράτησης", "Να διαγραφεί οριστικά αυτή η κράτηση;", [
      { text: "Άκυρο", style: "cancel" },
      {
        text: "Διαγραφή",
        style: "destructive",
        onPress: () => {
          void deleteBooking();
        },
      },
    ]);
  }

  async function deleteBooking() {
    if (deleting) return;
    setDeleting(true);
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", booking.id);
    setDeleting(false);

    if (error) {
      Alert.alert("Σφάλμα", "Αποτυχία διαγραφής: " + error.message);
      return;
    }

    onChanged?.();
    onClose();
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
          <Text style={styles.title}>Κράτηση</Text>
          {roomName ? <Text style={styles.subtitle}>{roomName}</Text> : null}

          <View style={styles.card}>
            <Text style={styles.line}>{booking.guest_name?.trim() || "—"}</Text>

            <View style={[styles.guestsBox, styles.guestsRow]}>
              <View style={styles.guestStepper}>
                <Text style={[styles.stepperLabel, styles.guestStepperLabel]}>
                  Ενήλικες
                </Text>
                <View style={styles.stepperControls}>
                  <Text style={styles.stepperValue}>{adults}</Text>
                </View>
              </View>

              <View style={styles.guestStepper}>
                <Text style={[styles.stepperLabel, styles.guestStepperLabel]}>
                  Παιδιά
                </Text>
                <Text style={styles.stepperValue}>{children}</Text>
              </View>
            </View>

            {guestsDirty ? (
              <Pressable
                style={[styles.saveGuestsBtn, saving && styles.btnDisabled]}
                onPress={saveGuests}
                disabled={saving}
              >
                <Text style={styles.saveGuestsText}>
                  {saving ? "Αποθήκευση…" : "Αποθήκευση ατόμων"}
                </Text>
              </Pressable>
            ) : null}

            <Text style={styles.line}>
              Από {formatDisplayDate(booking.start_date)} έως{" "}
              {formatDisplayDate(booking.end_date)}
            </Text>
            <Text style={styles.line}>{nights} διανυκτερεύσεις</Text>
            <Text style={styles.cost}>Κόστος: {cost.toFixed(2)}€</Text>
            {booking.deposit != null && Number(booking.deposit) > 0 ? (
              <Text style={styles.line}>
                Προκαταβολή: {Number(booking.deposit).toFixed(2)}€
              </Text>
            ) : null}
            {booking.settlement != null && Number(booking.settlement) > 0 ? (
              <Text style={styles.line}>
                Εξόφληση: {Number(booking.settlement).toFixed(2)}€
              </Text>
            ) : null}
            {booking.phone ? (
              <Text style={styles.line}>Τηλ: {booking.phone}</Text>
            ) : null}
          </View>

          <Pressable
            style={[styles.deleteBtn, deleting && styles.btnDisabled]}
            onPress={confirmDelete}
            disabled={deleting}
          >
            <Text style={styles.deleteText}>
              {deleting ? "Διαγραφή…" : "Διαγραφή κράτησης"}
            </Text>
          </Pressable>

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
      textAlign: "center",
      fontSize: s(14),
      color: brand.ink,
    },
    cost: {
      textAlign: "center",
      fontSize: s(16),
      fontWeight: "700",
      color: brand.primary,
      marginTop: 4,
    },
    guestsBox: {
      backgroundColor: brand.sand,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      marginVertical: 4,
    },
    guestsRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    guestStepper: {
      flex: 1,
      gap: 8,
      alignItems: "center",
    },
    guestStepperLabel: {
      textAlign: "center",
    },
    stepperLabel: {
      fontSize: s(14),
      color: brand.ink,
      fontWeight: "600",
    },
    stepperControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    stepperBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      backgroundColor: brand.white,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperBtnText: {
      fontSize: s(18),
      color: brand.ink,
      fontWeight: "600",
      lineHeight: s(20),
    },
    stepperValue: {
      minWidth: 24,
      textAlign: "center",
      fontSize: s(16),
      fontWeight: "700",
      color: brand.ink,
    },
    saveGuestsBtn: {
      backgroundColor: brand.primary,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: "center",
      marginTop: 4,
    },
    saveGuestsText: {
      color: brand.onAccent,
      fontWeight: "700",
      fontSize: s(14),
    },
    deleteBtn: {
      borderWidth: 1,
      borderColor: brand.danger,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: brand.white,
    },
    deleteText: {
      color: brand.danger,
      fontWeight: "700",
      fontSize: s(15),
    },
    btnDisabled: {
      opacity: 0.6,
    },
    closeBtn: {
      borderWidth: 1,
      borderColor: brand.ink,
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
