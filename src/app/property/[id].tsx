import { Booking, BookingsList } from "@/components/BookingsList";
import { RoomPlate } from "@/components/RoomPlate";
import RoomsSelector, { Room } from "@/components/RoomsSelector";
import { Fonts, type BrandColors } from "@/constants/theme";
import { addDays } from "@/lib/bookingInsights";
import { getBookingIncome,
  getPriceForNight,
  getRoomIncome,
  type RoomPricing,
} from "@/lib/roomPricing";
import { supabase } from "@/lib/supabase";
import { fs } from "@/lib/typography";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

type DayMarkKind = "stay" | "departure" | "split" | "selected";

type RoomAvailability = {
  [dateString: string]: {
    color?: string;
    textColor: string;
    startingDay?: boolean;
    endingDay?: boolean;
    kind?: DayMarkKind;
    selected?: boolean;
  };
};

type RoomsAvailability = Record<string, RoomAvailability>;

type BookingDraft = {
  room: Room;
  startDate: string;
  endDate: string;
};

function formatDisplayDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function parseDateInput(text: string): string | null {
  const trimmed = text.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function countNights(start: string, end: string): number {
  let nights = 0;
  let current = start;
  while (current < end) {
    nights += 1;
    current = addDays(current, 1);
  }
  return nights;
}

function buildAvailabilityFromBookings(
  bookings: Booking[],
  brand: BrandColors,
): RoomsAvailability {
  const result: RoomsAvailability = {};

  for (const booking of bookings) {
    if (!result[booking.room_id]) {
      result[booking.room_id] = {};
    }

    let current = booking.start_date;
    while (current <= booking.end_date) {
      const isEnd = current === booking.end_date;
      result[booking.room_id][current] = {
        color: isEnd ? brand.calendarTurnover : brand.calendarBlue,
        textColor: brand.white,
        startingDay: current === booking.start_date,
        endingDay: isEnd,
        kind: isEnd ? "departure" : "stay",
      };
      current = addDays(current, 1);
    }
  }

  for (const roomId of Object.keys(result)) {
    const roomBookings = bookings.filter((b) => b.room_id === roomId);
    const starts = new Set(roomBookings.map((b) => b.start_date));
    const ends = new Set(roomBookings.map((b) => b.end_date));

    for (const date of starts) {
      if (!ends.has(date)) continue;
      result[roomId][date] = {
        color: brand.calendarBlue,
        textColor: brand.white,
        startingDay: true,
        endingDay: true,
        kind: "split",
      };
    }
  }

  return result;
}

export default function PropertyScreen() {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectStartByRoom, setSelectStartByRoom] = useState<
    Record<string, string | null>
  >({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomAvailability, setRoomAvailability] = useState<RoomsAvailability>(
    {},
  );
  const [noteBooking, setNoteBooking] = useState<Booking | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [propertyName, setPropertyName] = useState("Κράτηση");
  const { id: propertyId } = useLocalSearchParams<{ id: string }>();
  const [needsSheets, setNeedsSheets] = useState(false);
  const [earlyCheckout, setEarlyCheckout] = useState(false);
  const [roomPrices, setRoomPrices] = useState<RoomPricing[]>([]);
  const [pricingRoom, setPricingRoom] = useState<Room | null>(null);
  const [priceStart, setPriceStart] = useState("");
  const [priceEnd, setPriceEnd] = useState("");
  const [priceAmount, setPriceAmount] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceDateField, setPriceDateField] = useState<"start" | "end" | null>(
    null,
  );
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [guestName, setGuestName] = useState("");
  const [notifyArrival, setNotifyArrival] = useState(true);
  const [notifyDeparture, setNotifyDeparture] = useState(true);
  const [savingBooking, setSavingBooking] = useState(false);
  const [bookingRoomId, setBookingRoomId] = useState<string | null>(null);

  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  const fetchPropertyData = useCallback(async () => {
    setLoading(true);

    const { data: property } = await supabase
      .from("properties")
      .select("name")
      .eq("id", propertyId)
      .maybeSingle();

    if (property?.name) {
      setPropertyName(property.name);
    }

    const { data: roomData, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .eq("property_id", propertyId);

    if (roomsError) {
      console.error("Error fetching rooms:", roomsError);
      setRooms([]);
      setBookings([]);
      setRoomAvailability({});
      setRoomPrices([]);
      setLoading(false);
      return;
    }

    const nextRooms = roomData ?? [];
    setRooms(nextRooms);

    const roomIds = nextRooms.map((room) => room.id);
    if (roomIds.length === 0) {
      setBookings([]);
      setRoomAvailability({});
      setRoomPrices([]);
      setLoading(false);
      return;
    }

    const [bookingsRes, pricesRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, room_id, start_date, end_date, departure_note, guest_name")
        .in("room_id", roomIds)
        .order("start_date", { ascending: true }),
      supabase
        .from("rooms_prices")
        .select("id, room_id, start_date, end_date, price_per_night")
        .in("room_id", roomIds)
        .order("start_date", { ascending: true }),
    ]);

    if (bookingsRes.error) {
      console.error("Error fetching bookings:", bookingsRes.error);
      setBookings([]);
      setRoomAvailability({});
    } else {
      const nextBookings = bookingsRes.data ?? [];
      setBookings(nextBookings);
      setRoomAvailability(buildAvailabilityFromBookings(nextBookings, brand));
    }

    if (pricesRes.error) {
      console.error("Error fetching room prices:", pricesRes.error);
      setRoomPrices([]);
    } else {
      setRoomPrices(
        (pricesRes.data ?? []).map((row) => ({
          ...row,
          start_date: String(row.start_date).slice(0, 10),
          end_date: String(row.end_date).slice(0, 10),
          price_per_night: Number(row.price_per_night),
        })),
      );
    }

    setLoading(false);
  }, [propertyId, brand]);

  useEffect(() => {
    fetchPropertyData();
  }, [fetchPropertyData, refreshKey]);

  async function overlapCheck(
    startDate: string,
    endDate: string,
    room: string | undefined,
  ) {
    const { data, error } = await supabase
      .from("bookings")
      .select("id")
      .eq("room_id", room)
      .lt("start_date", endDate)
      .gt("end_date", startDate);

    if (error) {
      console.error("Error checking overlap:", error);
      return false;
    }

    return (data ?? []).length > 0;
  }

  async function handleDayLongPress(room: Room, dateString: string) {
    const booking = bookings.find(
      (b) => b.room_id === room.id && b.start_date <= dateString && b.end_date >= dateString,
    );
    if (!booking) {
      alert("Δεν υπάρχει κράτηση αυτή τη μέρα.");
      return;
    }
    const note = booking.departure_note ?? "";
    setNoteBooking(booking);
    setNeedsSheets(note.includes("Αλλαγή σεντονιών"));
    setEarlyCheckout(note.includes("Πρόωρη αναχώρηση"));
  }

  async function saveNote() {
    if (!noteBooking) return;

    const parts: string[] = [];
    if (needsSheets) parts.push("Αλλαγή σεντονιών");
    if (earlyCheckout) parts.push("Πρόωρη αναχώρηση");

    const { error } = await supabase
      .from("bookings")
      .update({
        departure_note: parts.length > 0 ? parts.join(" · ") : null,
      })
      .eq("id", noteBooking.id);

    if (error) {
      alert("Σφάλμα κατά την αποθήκευση της σημείωσης: " + error.message);
      return;
    }

    setNoteBooking(null);
    setRefreshKey((key) => key + 1);
  }

  function formatNoteDate(iso?: string | null) {
    if (!iso) return "";
    const [year, month, day] = iso.split("-");
    return `${day}/${month}/${year}`;
  }

  function openPrices(room: Room) {
    setPricingRoom(room);
    setPriceStart("");
    setPriceEnd("");
    setPriceAmount("");
  }

  async function deleteRoom(room: Room) {
    const message = `Να διαγραφεί το δωμάτιο «${room.name}»; Θα διαγραφούν και οι κρατήσεις/τιμές του.`;

    const runDelete = async () => {
      const { error: bookingsError } = await supabase
        .from("bookings")
        .delete()
        .eq("room_id", room.id);
      if (bookingsError) {
        Alert.alert("Σφάλμα", bookingsError.message);
        return;
      }

      const { error: pricesError } = await supabase
        .from("rooms_prices")
        .delete()
        .eq("room_id", room.id);
      if (pricesError) {
        Alert.alert("Σφάλμα", pricesError.message);
        return;
      }

      const { error } = await supabase.from("rooms").delete().eq("id", room.id);
      if (error) {
        Alert.alert("Σφάλμα", error.message);
        return;
      }

      if (selectedRoom?.id === room.id) {
        setSelectedRoom(null);
      }
      setRefreshKey((k) => k + 1);
    };

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(message)) {
        await runDelete();
      }
      return;
    }

    Alert.alert("Διαγραφή δωματίου", message, [
      { text: "Άκυρο", style: "cancel" },
      {
        text: "Διαγραφή",
        style: "destructive",
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  }

  async function addRoomPrice() {
    if (!pricingRoom || savingPrice) return;

    const start = parseDateInput(priceStart) ?? priceStart;
    const end = parseDateInput(priceEnd) ?? priceEnd;
    const amount = Number(priceAmount.replace(",", "."));

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end)
    ) {
      Alert.alert("Σφάλμα", "Συμπλήρωσε ημερομηνίες σε μορφή dd/mm/yyyy.");
      return;
    }
    if (start > end) {
      Alert.alert("Σφάλμα", "Η έναρξη πρέπει να είναι πριν ή ίση με τη λήξη.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Σφάλμα", "Βάλε έγκυρη τιμή ανά διανυκτέρευση.");
      return;
    }

    setSavingPrice(true);
    const { error } = await supabase.from("rooms_prices").insert([
      {
        room_id: pricingRoom.id,
        start_date: start,
        end_date: end,
        price_per_night: amount,
      },
    ]);
    setSavingPrice(false);

    if (error) {
      console.error(error);
      Alert.alert("Σφάλμα", "Αποτυχία προσθήκης τιμής");
      return;
    }

    setPriceStart("");
    setPriceEnd("");
    setPriceAmount("");
    await fetchPropertyData();
  }

  async function deleteRoomPrice(priceId: string) {
    const { error } = await supabase
      .from("rooms_prices")
      .delete()
      .eq("id", priceId);

    if (error) {
      console.error(error);
      Alert.alert("Σφάλμα", "Αποτυχία διαγραφής τιμής");
      return;
    }

    await fetchPropertyData();
  }

  async function handleDayPress(room: Room, dateString: string) {
    const selectStartDate = selectStartByRoom[room.id] ?? null;

    if (!selectStartDate) {
      setSelectStartByRoom((prev) => ({ ...prev, [room.id]: dateString }));
      return;
    }

    const startDate = new Date(selectStartDate + "T12:00:00");
    const endDate = new Date(dateString + "T12:00:00");
    const diffDates =
      Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    if (diffDates < 0) {
      Alert.alert("Σφάλμα", "Η κράτηση πρέπει να είναι τουλάχιστον 1 ημέρα.");
      setSelectStartByRoom((prev) => ({ ...prev, [room.id]: null }));
      return;
    }

    if (selectStartDate > dateString) {
      Alert.alert("Σφάλμα", "Η λήξη πρέπει να είναι μετά την έναρξη.");
      setSelectStartByRoom((prev) => ({ ...prev, [room.id]: null }));
      return;
    }

    const isOverlap = await overlapCheck(selectStartDate, dateString, room.id);
    if (isOverlap) {
      Alert.alert(
        "Σφάλμα",
        "Η επιλεγμένη περίοδος επικαλύπτεται με υπάρχουσα κράτηση. Παρακαλώ επιλέξτε άλλη περίοδο.",
      );
      setSelectStartByRoom((prev) => ({ ...prev, [room.id]: null }));
      return;
    }

    setSelectStartByRoom((prev) => ({ ...prev, [room.id]: null }));
    setGuestName("");
    setNotifyArrival(true);
    setNotifyDeparture(true);
    setBookingDraft({
      room,
      startDate: selectStartDate,
      endDate: dateString,
    });
  }

  async function confirmBooking() {
    if (!bookingDraft || savingBooking) return;

    setSavingBooking(true);
    const base = {
      room_id: bookingDraft.room.id,
      start_date: bookingDraft.startDate,
      end_date: bookingDraft.endDate,
    };

    let { error } = await supabase.from("bookings").insert([
      {
        ...base,
        guest_name: guestName.trim() || null,
        notify_arrival: notifyArrival,
        notify_departure: notifyDeparture,
      },
    ]);

    if (error) {
      const fallback = await supabase.from("bookings").insert([base]);
      error = fallback.error;
    }

    setSavingBooking(false);

    if (error) {
      Alert.alert("Σφάλμα", "Αποτυχία αποθήκευσης κράτησης: " + error.message);
      return;
    }

    setBookingDraft(null);
    setRefreshKey((prev) => prev + 1);
  }

  function closeBookingDraft() {
    setBookingDraft(null);
    setGuestName("");
    setNotifyArrival(true);
    setNotifyDeparture(true);
  }

  function markedDatesForRoom(roomId: string) {
    const selectStartDate = selectStartByRoom[roomId] ?? null;
    const base = roomAvailability[roomId] ?? {};

    if (!selectStartDate) return base;

    return {
      ...base,
      [selectStartDate]: {
        ...(base[selectStartDate] ?? {
          textColor: brand.ink,
        }),
        selected: true,
        textColor: base[selectStartDate]?.textColor ?? brand.ink,
      },
    };
  }

  const calendarTheme = {
    backgroundColor: brand.white,
    calendarBackground: brand.white,
    textSectionTitleColor: brand.claySoft,
    selectedDayBackgroundColor: brand.primary,
    todayTextColor: brand.primary,
    dayTextColor: brand.ink,
    arrowColor: brand.primary,
    monthTextColor: brand.ink,
    textMonthFontWeight: "700" as const,
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: propertyName,
          headerTitleAlign: "center",
          headerTintColor: brand.primary,
          headerRight: () => (
            <Pressable onPress={() => (
              
            )}>
              <Text>2026</Text>
              </Pressable>
            ),
        }}
      />
      <ImageBackground
        source={require("@/assets/images/licensed-image.jpg")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.dim} />
        <SafeAreaView style={styles.safe} edges={["bottom", "left", "right"]}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >



              <RoomsSelector
                  key={refreshKey}
                propertyId={propertyId}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                onRoomsChanged={fetchPropertyData}
              />

            {rooms.length === 0 ? (
              <View style={styles.panel}>
                <Text style={styles.hint}>
                  Πρόσθεσε ένα δωμάτιο για να εμφανιστεί το ημερολόγιό του.
                </Text>
              </View>
            ) : (
              rooms.map((room) => {
                const start = selectStartByRoom[room.id] ?? null;
                const roomBookings = bookings.filter(
                  (b) => b.room_id === room.id,
                );

                return (
                  <View key={room.id} style={styles.panel}>
                    <View style={styles.roomHeader}>
                      <Pressable
                        style={styles.deleteRoomButton}
                        onPress={() => deleteRoom(room)}
                      >
                        <Text style={styles.deleteRoomButtonText}>
                          🗑️
                        </Text>
                      </Pressable>
                      <Text style={styles.roomHeaderTitle} numberOfLines={1}>
                        {room.name}
                      </Text>
                      <Pressable
                        style={styles.pricesButton}
                        onPress={() => openPrices(room)}
                      >
                        <Text style={styles.pricesButtonText}>💵</Text>
                      </Pressable>

                    </View>
                    <Text style={styles.hint}>
                      {start
                        ? `Έναρξη: ${start} — πάτα ημερομηνία λήξης (min 5 μέρες)`
                        : "Πάτα ημερομηνία έναρξης, μετά ημερομηνία λήξης"}
                    </Text>

                    <Calendar
                      markingType="period"
                      style={styles.calendar}
                      theme={{
                        ...calendarTheme,
                        stylesheet: {
                          calendar: {
                            main: {
                              week: {
                                marginTop: 0,
                                marginBottom: 0,
                                paddingVertical: 0,
                                flexDirection: "row",
                                justifyContent: "space-around",
                              },
                            },
                          },
                        },
                      }}
                      enableSwipeMonths
                      hideExtraDays={false}
                      showSixWeeks
                      firstDay={1}
                      markedDates={markedDatesForRoom(room.id)}
                      dayComponent={({ date, state, marking }) => {
                        if (!date) {
                          return <View style={styles.dayCell} />;
                        }

                        const mark = marking as
                          | RoomAvailability[string]
                          | undefined;
                        const price = getPriceForNight(
                          roomPrices,
                          room.id,
                          date.dateString,
                        );
                        const isOutsideMonth =
                          state === "disabled" || state === "inactive";
                        const kind = mark?.kind;
                        const isSplit = kind === "split";
                        const bg =
                          !isSplit && typeof mark?.color === "string"
                            ? mark.color
                            : undefined;
                        const onColored = Boolean(bg) || isSplit;
                        const textColor = onColored
                          ? brand.white
                          : isOutsideMonth
                            ? brand.claySoft
                            : state === "today"
                              ? brand.primary
                              : brand.ink;

                        return (
                          <Pressable
                            style={[
                              styles.dayCell,
                              !onColored && styles.dayCellIdle,
                              bg ? { backgroundColor: bg } : null,
                              mark?.selected && styles.dayCellSelected,
                              isOutsideMonth &&
                                !onColored &&
                                styles.dayCellOutside,
                            ]}
                            onPress={() =>
                              handleDayPress(room, date.dateString)
                            }
                            onLongPress={() =>
                              handleDayLongPress(room, date.dateString)
                            }
                          >
                            {isSplit ? (
                              <>
                                <View
                                  style={[
                                    StyleSheet.absoluteFill,
                                    { backgroundColor: brand.calendarBlue },
                                  ]}
                                />
                                <View style={styles.daySplitTriangle} />
                              </>
                            ) : null}
                            <Text
                              style={[styles.dayNumber, { color: textColor }]}
                            >
                              {date.day}
                            </Text>
                            <Text
                              style={[
                                styles.dayPrice,
                                {
                                  color: onColored
                                    ? brand.white
                                    : brand.claySoft,
                                },
                              ]}
                            >
                              {price > 0 ? `${price}€` : " "}
                            </Text>
                          </Pressable>
                        );
                      }}
                    />

                    <View style={styles.legend}>
                      <View style={styles.legendItem}>
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: brand.calendarBlue },
                          ]}
                        />
                        <Text style={styles.legendText}>Διαμονή</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={styles.dotSplit}>
                          <View style={styles.dotSplitSand} />
                          <View style={styles.dotSplitOrange} />
                        </View>
                        <Text style={styles.legendText}>Αναχώρηση</Text>
                      </View>
                      <View style={styles.legendItem}>
                        <View style={styles.dotSplit}>
                          <View style={styles.dotSplitTeal} />
                          <View style={styles.dotSplitOrange} />
                        </View>
                        <Text style={styles.legendText}>Αναχώρηση & άφιξη</Text>
                      </View>
                    </View>

                    <Text style={styles.hint}>
                      Κρατήστε πατημένο σε μια ημερομηνία για σημείωση
                      (αλλαγή σεντονιών / πρόωρη αναχώρηση).
                    </Text>

                    <Text style={styles.incomeText}>
                      Σύνολο εσόδων δωματίου:{`${getRoomIncome(bookings, roomPrices, room.id).toFixed(2)}€`}
                    </Text>

                    <View style={styles.bookingsList}>
                      <Pressable
                        onPress={() => setBookingRoomId(room.id)}
                        style={styles.bookingsButton}
                      >
                        <Text style={styles.bookingListTitle}>
                          Κρατήσεις ({roomBookings.length})
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>

      <Modal
        visible={bookingRoomId !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setBookingRoomId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <Text style={styles.bookingListTitle}>
              Κρατήσεις —{" "}
              {rooms.find((r) => r.id === bookingRoomId)?.name ?? ""} (
              {bookings.filter((b) => b.room_id === bookingRoomId).length})
            </Text>
            <BookingsList
              bookings={bookings.filter((b) => b.room_id === bookingRoomId)}
              rooms={rooms}
              roomPrices={roomPrices}
              loading={loading}
              onCancelled={fetchPropertyData}
            />
            <Pressable
              style={styles.modalCancel}
              onPress={() => setBookingRoomId(null)}
            >
              <Text style={styles.modalCancelText}>Κλείσιμο</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={noteBooking !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalDate}>
              {formatNoteDate(noteBooking?.end_date)}
            </Text>
            <Text style={styles.modalSubtitle}>Σημείωση ημέρας</Text>

            <Pressable
              style={[styles.optionRow, needsSheets && styles.optionRowActive]}
              onPress={() => setNeedsSheets((v) => !v)}
            >
              <Text style={styles.optionEmoji}>🧺</Text>
              <Text style={styles.optionLabel}>Αλλαγή σεντονιών</Text>
            </Pressable>

            <Pressable
              style={[
                styles.optionRow,
                earlyCheckout && styles.optionRowActive,
              ]}
              onPress={() => setEarlyCheckout((v) => !v)}
            >
              <Text style={styles.optionEmoji}>🏃</Text>
              <Text style={styles.optionLabel}>Πρόωρη αναχώρηση</Text>
            </Pressable>

            <Pressable style={styles.modalConfirm} onPress={saveNote}>
              <Text style={styles.modalConfirmText}>Αποθήκευση</Text>
            </Pressable>

            <Pressable
              style={styles.modalCancel}
              onPress={() => setNoteBooking(null)}
            >
              <Text style={styles.modalCancelText}>Άκυρο</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={bookingDraft !== null}
        animationType="fade"
        transparent
        onRequestClose={closeBookingDraft}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bookingModalPanel}>
            <Text style={styles.bookingModalTitle}>Νέα κράτηση</Text>
            {bookingDraft ? (
              <>
                <RoomPlate label={bookingDraft.room.name} compact />
                <Text style={styles.bookingModalDates}>
                  {formatDisplayDate(bookingDraft.startDate)} →{" "}
                  {formatDisplayDate(bookingDraft.endDate)} ·{" "}
                  {countNights(bookingDraft.startDate, bookingDraft.endDate)}{" "}
                  διανυκτ.
                </Text>
                <Text style={styles.bookingModalCost}>
                  Εκτιμώμενο κόστος:{" "}
                  <Text style={styles.bookingModalCostValue}>
                    {getBookingIncome(
                      {
                        id: "draft",
                        room_id: bookingDraft.room.id,
                        start_date: bookingDraft.startDate,
                        end_date: bookingDraft.endDate,
                      },
                      roomPrices,
                    ).toFixed(2)}
                    €
                  </Text>
                </Text>

                <TextInput
                  style={styles.bookingGuestInput}
                  placeholder="Όνομα πελάτη"
                  placeholderTextColor={brand.claySoft}
                  value={guestName}
                  onChangeText={setGuestName}
                />

                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setNotifyArrival((v) => !v)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      notifyArrival && styles.checkboxChecked,
                    ]}
                  >
                    {notifyArrival ? (
                      <Text style={styles.checkboxTick}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Ειδοποίηση κατά την άφιξη
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setNotifyDeparture((v) => !v)}
                >
                  <View
                    style={[
                      styles.checkbox,
                      notifyDeparture && styles.checkboxChecked,
                    ]}
                  >
                    {notifyDeparture ? (
                      <Text style={styles.checkboxTick}>✓</Text>
                    ) : null}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Ειδοποίηση κατά την αναχώρηση
                  </Text>
                </Pressable>

                <View style={styles.bookingModalActions}>
                  <Pressable
                    style={styles.bookingCancelBtn}
                    onPress={closeBookingDraft}
                  >
                    <Text style={styles.bookingCancelText}>Άκυρο</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.bookingSaveBtn,
                      savingBooking && { opacity: 0.6 },
                    ]}
                    onPress={confirmBooking}
                    disabled={savingBooking}
                  >
                    <Text style={styles.bookingSaveText}>
                      {savingBooking ? "..." : "Αποθήκευση"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={pricingRoom !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setPricingRoom(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalDate}>Τιμές — {pricingRoom?.name}</Text>

            {roomPrices.filter((p) => p.room_id === pricingRoom?.id).length ===
            0 ? (
              <Text style={styles.modalSubtitle}>Δεν έχουν οριστεί τιμές.</Text>
            ) : (
              roomPrices
                .filter((p) => p.room_id === pricingRoom?.id)
                .map((price) => (
                  <View key={price.id} style={styles.priceRow}>
                    <Text style={styles.priceRowText}>
                      {formatDisplayDate(price.start_date)} →{" "}
                      {formatDisplayDate(price.end_date)}
                      {"  "}
                      {price.price_per_night.toFixed(2)}€/διαν.
                    </Text>
                    <Pressable
                      style={styles.priceDelete}
                      onPress={() => deleteRoomPrice(price.id)}
                    >
                      <Text style={styles.priceDeleteText}>Διαγραφή</Text>
                    </Pressable>
                  </View>
                ))
            )}

            <Text style={styles.priceSectionTitle}>Νέα περίοδος τιμής</Text>

            <View style={styles.priceDateRow}>
              <View style={styles.priceDateField}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="dd/mm/yyyy"
                  placeholderTextColor={brand.claySoft}
                  value={priceStart ? formatDisplayDate(priceStart) : ""}
                  onChangeText={(text) => {
                    setPriceStart(parseDateInput(text) ?? text);
                  }}
                />
                <Pressable
                  style={styles.priceCalendarBtn}
                  onPress={() => setPriceDateField("start")}
                >
                  <Text>📅</Text>
                </Pressable>
              </View>
              <View style={styles.priceDateField}>
                <TextInput
                  style={styles.priceInput}
                  placeholder="dd/mm/yyyy"
                  placeholderTextColor={brand.claySoft}
                  value={priceEnd ? formatDisplayDate(priceEnd) : ""}
                  onChangeText={(text) => {
                    setPriceEnd(parseDateInput(text) ?? text);
                  }}
                />
                <Pressable
                  style={styles.priceCalendarBtn}
                  onPress={() => setPriceDateField("end")}
                >
                  <Text>📅</Text>
                </Pressable>
              </View>
            </View>

            <TextInput
              style={styles.priceInput}
              placeholder="€ / διανυκτέρευση"
              placeholderTextColor={brand.claySoft}
              value={priceAmount}
              onChangeText={setPriceAmount}
              keyboardType="decimal-pad"
            />

            <View style={styles.priceActions}>
              <Pressable
                style={[styles.modalCancel, styles.priceActionBtn]}
                onPress={() => setPricingRoom(null)}
              >
                <Text style={styles.modalCancelText}>Κλείσιμο</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalConfirm,
                  styles.priceActionBtn,
                  savingPrice && { opacity: 0.6 },
                ]}
                onPress={addRoomPrice}
                disabled={savingPrice}
              >
                <Text style={styles.modalConfirmText}>
                  {savingPrice ? "..." : "Προσθήκη"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={priceDateField !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPriceDateField(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalSubtitle}>
              {priceDateField === "start" ? "Έναρξη περιόδου" : "Λήξη περιόδου"}
            </Text>
            <Calendar
              enableSwipeMonths
              onDayPress={(day) => {
                if (priceDateField === "start") setPriceStart(day.dateString);
                if (priceDateField === "end") setPriceEnd(day.dateString);
                setPriceDateField(null);
              }}
              theme={{
                todayTextColor: brand.primary,
                arrowColor: brand.primary,
                selectedDayBackgroundColor: brand.primary,
              }}
            />
            <Pressable
              style={styles.modalCancel}
              onPress={() => setPriceDateField(null)}
            >
              <Text style={styles.modalCancelText}>Κλείσιμο</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: brand.ink,
  },
  backgroundImage: {
    flex: 1,
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(44, 36, 28, 0.45)",
  },
  safe: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 14,
  },
  panel: {
    backgroundColor: brand.sand,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: brand.sandDeep,
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 6,
  },
  roomHeaderTitle: {
    flex: 1,
    flexShrink: 1,
    textAlign: "center",
    color: brand.white,
    fontSize: s(16),
    fontWeight: "700",
  },
  pricesButton: {
    backgroundColor: brand.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand.white,
  },
  pricesButtonText: {
    color: brand.white,
    fontWeight: "700",
    fontSize: s(13),
  },
  deleteRoomButton: {
    backgroundColor: brand.danger,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  deleteRoomButtonText: {
    color: brand.white,
    fontWeight: "700",
    fontSize: s(13),
  },
  incomeText: {
    marginTop: 12,
    fontSize: s(14),
    fontWeight: "600",
    color: brand.ink,
  },
  bookingsTitle: {
    fontSize: s(14),
    fontWeight: "700",
    color: brand.primary,
    marginTop: 14,
    marginBottom: 8,
  },
  hint: {
    fontSize: s(12),
    color: brand.claySoft,
    marginBottom: 8,
    marginTop: 4,
    lineHeight: s(16),
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 6,
    marginBottom: 2,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  dotSplit: {
    width: 10,
    height: 10,
    borderRadius: 3,
    overflow: "hidden",
  },
  dotSplitTeal: {
    ...StyleSheet.absoluteFill,
    backgroundColor: brand.calendarBlue,
  },
  dotSplitSand: {
    ...StyleSheet.absoluteFill,
    backgroundColor: brand.sandDeep,
  },
  dotSplitOrange: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderRightWidth: 10,
    borderTopColor: brand.calendarTurnover,
    borderRightColor: "transparent",
  },
  legendText: {
    fontSize: s(11),
    color: brand.claySoft,
  },
  calendar: {
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
  },

  // modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(44, 36, 28, 0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalPanel: {
    backgroundColor: brand.white,
    borderRadius: 24,
    padding: 22,
    gap: 12,
  },
  modalDate: {
    fontSize: s(28),
    fontWeight: "700",
    color: brand.ink,
  },
  modalSubtitle: {
    fontSize: s(15),
    color: brand.claySoft,
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: brand.sand,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionRowActive: {
    borderColor: brand.primary,
    backgroundColor: brand.sandDeep,
  },
  optionEmoji: {
    fontSize: s(22),
  },
  optionLabel: {
    fontSize: s(16),
    fontWeight: "600",
    color: brand.ink,
    flex: 1,
  },
  modalConfirm: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: brand.primary,
    alignItems: "center",
  },
  modalConfirmText: {
    color: brand.white,
    fontWeight: "700",
    fontSize: s(16),
  },
  modalCancel: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: brand.sandDeep,
    alignItems: "center",
    backgroundColor: brand.white,
  },
  modalCancelText: {
    color: brand.ink,
    fontWeight: "700",
    fontSize: s(16),
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: brand.sand,
    borderRadius: 12,
    padding: 10,
  },
  priceRowText: {
    flex: 1,
    fontSize: s(13),
    color: brand.ink,
    fontWeight: "600",
  },
  priceDelete: {
    borderWidth: 1,
    borderColor: brand.danger,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  priceDeleteText: {
    color: brand.danger,
    fontWeight: "700",
    fontSize: s(12),
  },
  priceSectionTitle: {
    marginTop: 4,
    fontSize: s(15),
    fontWeight: "700",
    color: brand.ink,
  },
  priceDateRow: {
    flexDirection: "row",
    gap: 8,
  },
  priceDateField: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  priceInput: {
    borderWidth: 1,
    borderColor: brand.sandDeep,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 36,
    fontSize: s(14),
    color: brand.ink,
    backgroundColor: brand.sand,
  },
  priceCalendarBtn: {
    position: "absolute",
    right: 8,
    height: "100%",
    justifyContent: "center",
  },
  priceActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  priceActionBtn: {
    flex: 1,
    marginTop: 0,
  },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    padding: 0,
    marginVertical: 1,
  },
  dayCellIdle: {
    backgroundColor: brand.sand,
  },
  dayCellOutside: {
    opacity: 0.45,
  },
  dayCellSelected: {
    borderWidth: 1.5,
    borderColor: brand.ink,
  },
  daySplitTriangle: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: 32,
    borderRightWidth: 32,
    borderTopColor: brand.calendarTurnover,
    borderRightColor: "transparent",
  },
  dayNumber: {
    fontSize: s(10),
    lineHeight: s(11),
    fontWeight: "600",
    zIndex: 1,
  },
  dayPrice: {
    fontSize: s(6),
    lineHeight: s(7),
    marginTop: 0,
    zIndex: 1,
  },
  bookingModalPanel: {
    backgroundColor: brand.white,
    borderRadius: 20,
    padding: 22,
    gap: 12,
  },
  bookingModalTitle: {
    fontSize: s(24),
    fontWeight: "700",
    color: brand.ink,
    fontFamily: Fonts?.serif,
  },
  bookingModalDates: {
    fontSize: s(13),
    color: brand.claySoft,
    fontFamily: Fonts?.mono,
  },
  bookingModalCost: {
    fontSize: s(15),
    color: brand.ink,
  },
  bookingModalCostValue: {
    fontWeight: "700",
  },
  bookingGuestInput: {
    borderWidth: 1,
    borderColor: brand.sandDeep,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: s(15),
    color: brand.ink,
    backgroundColor: brand.white,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: brand.claySoft,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brand.white,
  },
  checkboxChecked: {
    backgroundColor: brand.calendarBlue,
    borderColor: brand.calendarBlue,
  },
  checkboxTick: {
    color: brand.white,
    fontSize: s(14),
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: s(14),
    color: brand.ink,
    flex: 1,
  },
  bookingModalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  bookingCancelBtn: {
    borderWidth: 1,
    borderColor: brand.sandDeep,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: brand.white,
  },
  bookingCancelText: {
    color: brand.ink,
    fontWeight: "600",
  },
  bookingSaveBtn: {
    backgroundColor: brand.calendarBlue,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    },
    bookingsButton: {
      alignItems: "center",
      textAlign: "center",
      backgroundColor: brand.primary,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },

  bookingSaveText: {
    color: brand.white,
    fontWeight: "700",
  },
  bookingsList: {
    marginTop: 12,
  },
  bookingListTitle: {
    fontSize: s(15),
    fontWeight: "700",
    color: brand.ink,
    marginBottom: 6,
  },
});
}

