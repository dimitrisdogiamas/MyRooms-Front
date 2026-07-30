import { Booking, BookingsList } from "@/components/BookingsList";
import RoomsSelector, { Room } from "@/components/RoomsSelector";
import { Brand } from "@/constants/theme";
import { getRoomIncome, type RoomPricing } from "@/lib/roomPricing";
import { supabase } from "@/lib/supabase";
import { Stack, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

type RoomAvailability = {
  [dateString: string]: {
    color: string;
    textColor: string;
    startingDay?: boolean;
    endingDay?: boolean;
  };
};

type RoomsAvailability = Record<string, RoomAvailability>;

function toIsoDate(date: Date) {
  return date.toISOString().split("T")[0];
}

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

function buildAvailabilityFromBookings(bookings: Booking[]): RoomsAvailability {
  const result: RoomsAvailability = {};

  for (const booking of bookings) {
    if (!result[booking.room_id]) {
      result[booking.room_id] = {};
    }

    const current = new Date(booking.start_date);
    const end = new Date(booking.end_date);

    while (current <= end) {
      const iso = toIsoDate(current);
      result[booking.room_id][iso] = {
        color:
          iso === booking.end_date
            ? Brand.calendarTurnover
            : Brand.calendarBlue,
        textColor: Brand.white,
        startingDay: iso === booking.start_date,
        endingDay: iso === booking.end_date,
      };
      current.setDate(current.getDate() + 1);
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
        .select("id, room_id, start_date, end_date, departure_note")
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
      setRoomAvailability(buildAvailabilityFromBookings(nextBookings));
    }

    if (pricesRes.error) {
      console.error("Error fetching room prices:", pricesRes.error);
      setRoomPrices([]);
    } else {
      setRoomPrices(
        (pricesRes.data ?? []).map((row) => ({
          ...row,
          price_per_night: Number(row.price_per_night),
        })),
      );
    }

    setLoading(false);
  }, [propertyId]);

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
      (b) => b.room_id === room.id && b.end_date === dateString,
    );
    if (!booking) {
      alert("Δεν είναι η μέρα αναχώρησης. Παρακαλώ επιλέξτε άλλη ημερομηνία.");
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

    const startDate = new Date(selectStartDate);
    const endDate = new Date(dateString);
    const diffDates =
      Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    if (diffDates < 5) {
      alert("Η κράτηση πρέπει να είναι τουλάχιστον 5 ημέρες.");
      setSelectStartByRoom((prev) => ({ ...prev, [room.id]: null }));
      return;
    }

    const isOverlap = await overlapCheck(selectStartDate, dateString, room.id);
    if (isOverlap) {
      alert(
        "Η επιλεγμένη περίοδος επικαλύπτεται με υπάρχουσα κράτηση. Παρακαλώ επιλέξτε άλλη περίοδο.",
      );
      setSelectStartByRoom((prev) => ({ ...prev, [room.id]: null }));
      return;
    }

    const { error } = await supabase.from("bookings").insert([
      {
        room_id: room.id,
        start_date: selectStartDate,
        end_date: dateString,
      },
    ]);

    if (error) {
      alert("Σφάλμα κατά την αποθήκευση της κράτησης: " + error.message);
      setSelectStartByRoom((prev) => ({ ...prev, [room.id]: null }));
      return;
    }

    setSelectStartByRoom((prev) => ({ ...prev, [room.id]: null }));
    setRefreshKey((prev) => prev + 1);
  }

  function markedDatesForRoom(roomId: string) {
    const selectStartDate = selectStartByRoom[roomId] ?? null;
    return {
      ...(roomAvailability[roomId] ?? {}),
      ...(selectStartDate
        ? {
            [selectStartDate]: {
              color: Brand.gold,
              textColor: Brand.white,
              startingDay: true,
              endingDay: true,
            },
          }
        : {}),
    };
  }

  const calendarTheme = {
    backgroundColor: Brand.white,
    calendarBackground: Brand.white,
    textSectionTitleColor: Brand.claySoft,
    selectedDayBackgroundColor: Brand.gold,
    todayTextColor: Brand.goldDark,
    dayTextColor: Brand.ink,
    arrowColor: Brand.clay,
    monthTextColor: Brand.ink,
    textMonthFontWeight: "700" as const,
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{ title: propertyName, headerTintColor: Brand.clay }}
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
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>{propertyName}</Text>
              <Text style={styles.heroSubtitle}>

              </Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Δωμάτια</Text>
              <RoomsSelector
                propertyId={propertyId}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
                onRoomsChanged={fetchPropertyData}
              />
            </View>

            <View style={styles.legendPanel}>
              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: Brand.calendarBlue },
                    ]}
                  />
                  <Text style={styles.legendText}>Κράτηση</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: Brand.calendarTurnover },
                    ]}
                  />
                  <Text style={styles.legendText}>Αναχώρηση</Text>
                </View>
              </View>
            </View>

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
                      <Text style={styles.panelTitle}>{room.name}</Text>
                      <Pressable
                        style={styles.pricesButton}
                        onPress={() => openPrices(room)}
                      >
                        <Text style={styles.pricesButtonText}>💵 Τιμές</Text>
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
                      theme={calendarTheme}
                      enableSwipeMonths
                      current={"2026-07-18"}
                      markedDates={markedDatesForRoom(room.id)}
                      onDayLongPress={(day) => {
                        handleDayLongPress(room, day.dateString);
                      }}
                      onDayPress={(day) => {
                        handleDayPress(room, day.dateString);
                      }}
                    />

                    <Text style={styles.incomeText}>
                      Σύνολο εσόδων δωματίου:{`${getRoomIncome(bookings, roomPrices, room.id).toFixed(2)}€`}
                    </Text>

                    <Text style={styles.bookingsTitle}>
                      Κρατήσεις — {room.name}
                    </Text>
                    <BookingsList
                      bookings={roomBookings}
                      loading={loading}
                      onCancelled={fetchPropertyData}
                      rooms={rooms}
                    />
                  </View>
                );
              })
            )}
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
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
                  placeholderTextColor={Brand.claySoft}
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
                  placeholderTextColor={Brand.claySoft}
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
              placeholderTextColor={Brand.claySoft}
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
                todayTextColor: Brand.goldDark,
                arrowColor: Brand.clay,
                selectedDayBackgroundColor: Brand.clay,
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Brand.ink,
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
  hero: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  heroEyebrow: {
    color: Brand.gold,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    color: Brand.white,
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 15,
  },
  panel: {
    backgroundColor: Brand.sand,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
  },
  legendPanel: {
    backgroundColor: "rgba(247, 241, 234, 0.9)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Brand.ink,
    marginBottom: 0,
    flex: 1,
  },
  roomHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  pricesButton: {
    backgroundColor: Brand.clay,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  pricesButtonText: {
    color: Brand.white,
    fontWeight: "700",
    fontSize: 13,
  },
  incomeText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
    color: Brand.ink,
  },
  bookingsTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Brand.clay,
    marginTop: 14,
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: Brand.claySoft,
    marginBottom: 12,
    lineHeight: 18,
  },
  legend: {
    flexDirection: "row",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: Brand.claySoft,
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
    backgroundColor: Brand.white,
    borderRadius: 24,
    padding: 22,
    gap: 12,
  },
  modalDate: {
    fontSize: 28,
    fontWeight: "700",
    color: Brand.ink,
  },
  modalSubtitle: {
    fontSize: 15,
    color: Brand.claySoft,
    marginBottom: 4,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Brand.sand,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionRowActive: {
    borderColor: Brand.gold,
    backgroundColor: Brand.sandDeep,
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: Brand.ink,
    flex: 1,
  },
  modalConfirm: {
    marginTop: 4,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Brand.clay,
    alignItems: "center",
  },
  modalConfirmText: {
    color: Brand.white,
    fontWeight: "700",
    fontSize: 16,
  },
  modalCancel: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
    alignItems: "center",
    backgroundColor: Brand.white,
  },
  modalCancelText: {
    color: Brand.ink,
    fontWeight: "700",
    fontSize: 16,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Brand.sand,
    borderRadius: 12,
    padding: 10,
  },
  priceRowText: {
    flex: 1,
    fontSize: 13,
    color: Brand.ink,
    fontWeight: "600",
  },
  priceDelete: {
    borderWidth: 1,
    borderColor: Brand.danger,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  priceDeleteText: {
    color: Brand.danger,
    fontWeight: "700",
    fontSize: 12,
  },
  priceSectionTitle: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "700",
    color: Brand.ink,
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
    borderColor: Brand.sandDeep,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingRight: 36,
    fontSize: 14,
    color: Brand.ink,
    backgroundColor: Brand.sand,
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
});
