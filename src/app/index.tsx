import { ThemedText } from "@/components/themed-text";
import { Fonts, Spacing, type BrandColors } from "@/constants/theme";
import { type Booking,
  getAvailableRooms,
  getGaps,
  getSheetDays,
  getTurnovers,
  type Room,
} from "@/lib/bookingInsights";
import { supabase } from "@/lib/supabase";
import { fs } from "@/lib/typography";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

type Property = {
  id: string;
  name: string;
};

type InsightModalState = {
  title: string;
  lines: string[];
} | null;

type DatePickerField = "arrivals" | "departures" | null;

/** Store as YYYY-MM-DD; show as dd/mm/yyyy */
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

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];
  return `${year}-${month}-${day}`;
}

const PropertiesList = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [insightModal, setInsightModal] = useState<InsightModalState>(null);
  const [arrivals, setArrivals] = useState<string>("");
  const [departures, setDepartures] = useState<string>("");
  const [datePickerField, setDatePickerField] = useState<DatePickerField>(null);
  const [alerts, setAlerts] = useState<string[]>([]);

  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  const fetchHomeData = useCallback(async () => {
    const [propertiesRes, roomsRes, bookingsRes] = await Promise.all([
      supabase
        .from("properties")
        .select("*")
        .order("name", { ascending: true }),
      supabase.from("rooms").select("id, name, property_id"),
      supabase
        .from("bookings")
        .select("id, room_id, start_date, end_date, departure_note"),
    ]);


    if (propertiesRes.error) {
      console.error(propertiesRes.error);
      Alert.alert("Σφάλμα", "Αποτυχία φόρτωσης ιδιοκτησιών");
    } else {
      setProperties(propertiesRes.data ?? []);
    }

    if (roomsRes.error) {
      console.error(roomsRes.error);
    } else {
      setRooms(roomsRes.data ?? []);
    }

    if (bookingsRes.error) {
      console.error(bookingsRes.error);
    } else {
      setBookings(bookingsRes.data ?? []);
    }

    const allRooms = roomsRes.data ?? [];
    const allBookings = bookingsRes.data ?? [];
    const today = new Date().toISOString().split("T")[0];
    const messages: string[] = [];

    const turnovers = getTurnovers(allBookings, allRooms);
    for (const t of turnovers) {
      if (t.date === today) {
        messages.push(`Αλλαγή σήμερα: ${t.roomName}`);
      }
    }

    const sheets = getSheetDays(allBookings, allRooms);
    for (const s of sheets) {
      if (s.date === today) {
        messages.push(`Σεντόνια σήμερα: ${s.roomName}`);
      }
    }

    setAlerts(messages);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  function openInsight(
    propertyId: string,
    kind: "turnovers" | "sheets" | "gaps",
  ) {
    const propertyRooms = rooms.filter((r) => r.property_id === propertyId);

    if (kind === "turnovers") {
      const result = getTurnovers(bookings, propertyRooms);
      setInsightModal({
        title: "Αλλαγές",
        lines:
          result.length === 0
            ? ["Δεν υπάρχουν αλλαγές."]
            : result.map(
                (t) =>
                  `${t.roomName}: ${t.date}${t.note ? ` — ${t.note}` : ""}`,
              ),
      });
      return;
    }

    if (kind === "sheets") {
      const result = getSheetDays(bookings, propertyRooms);
      setInsightModal({
        title: "Σεντόνια",
        lines:
          result.length === 0
            ? ["Δεν υπάρχουν ημερομηνίες για σεντόνια."]
            : result.map((s) => `${s.roomName}: ${s.date}`),
      });
      return;
    }

    const result = getGaps(bookings, propertyRooms);
    setInsightModal({
      title: "Κενά",
      lines:
        result.length === 0
          ? ["Δεν υπάρχουν κενά."]
          : result.map(
              (g) => `${g.roomName}: ${g.from} – ${g.to} (${g.nights} βράδια)`,
            ),
    });
  }

  function searchAvailability() {
    const arrival = parseDateInput(arrivals) ?? arrivals;
    const departure = parseDateInput(departures) ?? departures;

    if (!arrival || !departure) {
      Alert.alert("Σφάλμα", "Συμπλήρωσε άφιξη και αναχώρηση.");
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(arrival) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(departure)
    ) {
      Alert.alert(
        "Σφάλμα",
        "Χρησιμοποίησε μορφή dd/mm/yyyy ή διάλεξε από το ημερολόγιο.",
      );
      return;
    }
    if (arrival >= departure) {
      Alert.alert("Σφάλμα", "Η άφιξη πρέπει να είναι πριν την αναχώρηση.");
      return;
    }

    const result = getAvailableRooms(bookings, rooms, arrival, departure);
    setInsightModal({
      title: "Διαθέσιμα δωμάτια",
      lines:
        result.length === 0
          ? ["Κανένα διαθέσιμο."]
          : result.map((r) => {
              const propertyName =
                properties.find((p) => p.id === r.propertyId)?.name ?? "";
              const turnover = r.isTurnoverArrival ? " · αλλαγή" : "";
              return `${propertyName} — ${r.roomName}${turnover}`;
            }),
    });
  }

  async function addProperty() {
    const name = newName.trim();
    if (!name || saving) return;

    setSaving(true);
    const { error } = await supabase.from("properties").insert([{ name }]);
    setSaving(false);

    if (error) {
      console.error(error);
      Alert.alert("Σφάλμα", "Αποτυχία προσθήκης ιδιοκτησίας");
      return;
    }

    setNewName("");
    setLoading(true);
    await fetchHomeData();
  }

  async function deleteProperty(id: string) {
    Alert.alert(
      "Διαγραφή ιδιοκτησίας",
      "Θα διαγραφούν και τα δωμάτια και οι κρατήσεις τους.\n\nΣυνέχεια;",
      [
        { text: "Άκυρο", style: "cancel" },
        {
          text: "Διαγραφή",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);

            const { data: roomsData, error: roomsFetchError } = await supabase
              .from("rooms")
              .select("id")
              .eq("property_id", id);

            if (roomsFetchError) {
              setDeleting(false);
              console.error(roomsFetchError);
              Alert.alert("Σφάλμα", "Αποτυχία διαγραφής ιδιοκτησίας");
              return;
            }

            const roomIds = (roomsData ?? []).map((room) => room.id);

            if (roomIds.length > 0) {
              const { error: bookingsError } = await supabase
                .from("bookings")
                .delete()
                .in("room_id", roomIds);

              if (bookingsError) {
                setDeleting(false);
                console.error(bookingsError);
                Alert.alert("Σφάλμα", "Αποτυχία διαγραφής κρατήσεων");
                return;
              }

              const { error: roomsError } = await supabase
                .from("rooms")
                .delete()
                .eq("property_id", id);

              if (roomsError) {
                setDeleting(false);
                console.error(roomsError);
                Alert.alert("Σφάλμα", "Αποτυχία διαγραφής δωματίων");
                return;
              }
            }

            const { error } = await supabase
              .from("properties")
              .delete()
              .eq("id", id);

            setDeleting(false);

            if (error) {
              console.error(error);
              Alert.alert("Σφάλμα", "Αποτυχία διαγραφής ιδιοκτησίας");
              return;
            }

            await fetchHomeData();
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ThemedText style={styles.muted}>Φόρτωση...</ThemedText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.homeHeader}>
        <View style={styles.eyebrowRow}>
          <Text style={styles.homeEyebrow}>ΒΙΒΛΙΟ ΚΑΤΑΛΥΜΑΤΟΣ</Text>
          <Pressable
            style={styles.settingsButton}
            onPress={() => router.push("/settings")}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </Pressable>
        </View>
        <Text style={styles.homeTitle}>Διαχείριση ενοικιαζόμενων δωματίων</Text>
      </View>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.input, styles.addInput]}
          placeholder="Όνομα σπιτιού / καταλύματος"
          placeholderTextColor={brand.claySoft}
          value={newName}
          onChangeText={setNewName}
          onSubmitEditing={addProperty}
          returnKeyType="done"
        />
        <Pressable
          style={[
            styles.confirmButton,
            styles.addSubmit,
            saving && styles.confirmDisabled,
          ]}
          onPress={addProperty}
          disabled={saving}
        >
          <ThemedText style={styles.confirmText}>
            {saving ? "..." : "Προσθήκη"}
          </ThemedText>
        </Pressable>
      </View>

      {alerts.length > 0 && (
        <View style={styles.alertBanner}>
          {alerts.map((msg, i) => (
            <Text key={i} style={styles.alertText}>⚠️ {msg}</Text>
          ))}
        </View>
      )}

      <FlatList
        data={properties}
        keyExtractor={(item) => item.id}
        style={styles.flatList}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <ThemedText style={styles.muted}>
            Δεν υπάρχουν ιδιοκτησίες ακόμα. Πρόσθεσε την πρώτη σου.
          </ThemedText>
        }
        ListFooterComponent={
          <View style={styles.searchPanel}>
            <ThemedText style={styles.searchTitle}>
              Αναζήτηση διαθεσιμότητας
            </ThemedText>

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="dd/mm/yyyy"
                  placeholderTextColor={brand.claySoft}
                  value={arrivals ? formatDisplayDate(arrivals) : ""}
                  onChangeText={(text) => {
                    const iso = parseDateInput(text);
                    setArrivals(iso ?? text);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                />
                <Pressable
                  style={styles.dateIconBtn}
                  onPress={() => setDatePickerField("arrivals")}
                  hitSlop={8}
                >
                  <Text style={styles.dateIconText}>📅</Text>
                </Pressable>
              </View>

              <View style={styles.dateField}>
                <TextInput
                  style={[styles.input, styles.dateInput]}
                  placeholder="dd/mm/yyyy"
                  placeholderTextColor={brand.claySoft}
                  value={departures ? formatDisplayDate(departures) : ""}
                  onChangeText={(text) => {
                    const iso = parseDateInput(text);
                    setDepartures(iso ?? text);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                />
                <Pressable
                  style={styles.dateIconBtn}
                  onPress={() => setDatePickerField("departures")}
                  hitSlop={8}
                >
                  <Text style={styles.dateIconText}>📅</Text>
                </Pressable>
              </View>
            </View>

            <Pressable style={styles.searchButton} onPress={searchAvailability}>
              <ThemedText style={styles.searchButtonText}>Αναζήτηση</ThemedText>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Pressable
              style={styles.cardMain}
              onPress={() => router.push(`/property/${item.id}`)}
            >
              <ThemedText style={styles.cardText}>{item.name}</ThemedText>
              <ThemedText style={styles.cardHint}>Κρατήσεις →</ThemedText>
            </Pressable>
            <Pressable
              style={styles.deleteButton}
              onPress={() => deleteProperty(item.id)}
              disabled={deleting}
            >
              <ThemedText style={styles.deleteButtonText}>Διαγραφή</ThemedText>
            </Pressable>
            <View style={styles.insightRow}>
              <Pressable
                style={styles.insightChip}
                onPress={() => openInsight(item.id, "turnovers")}
              >
                <ThemedText style={styles.insightChipText}>Αλλαγές</ThemedText>
              </Pressable>
              <Pressable
                style={styles.insightChip}
                onPress={() => openInsight(item.id, "sheets")}
              >
                <ThemedText style={styles.insightChipText}>Σεντόνια</ThemedText>
              </Pressable>
              <Pressable
                style={styles.insightChip}
                onPress={() => openInsight(item.id, "gaps")}
              >
                <ThemedText style={styles.insightChipText}>Κενά</ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      />

      <Modal
        visible={insightModal !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setInsightModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>{insightModal?.title}</Text>
            {insightModal?.lines.map((line, index) => (
              <Text key={`${line}-${index}`} style={styles.modalLine}>
                {line}
              </Text>
            ))}
            <Pressable
              style={styles.modalClose}
              onPress={() => setInsightModal(null)}
            >
              <Text style={styles.modalCloseText}>Κλείσιμο</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={datePickerField !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerField(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>
              {datePickerField === "arrivals" ? "Άφιξη" : "Αναχώρηση"}
            </Text>
            <Calendar
              enableSwipeMonths
              current={
                (datePickerField === "arrivals" ? arrivals : departures) ||
                undefined
              }
              markedDates={(() => {
                const selected =
                  datePickerField === "arrivals" ? arrivals : departures;
                if (!selected || !/^\d{4}-\d{2}-\d{2}$/.test(selected)) {
                  return undefined;
                }
                return {
                  [selected]: {
                    selected: true,
                    selectedColor: brand.primary,
                  },
                };
              })()}
              onDayPress={(day) => {
                if (datePickerField === "arrivals") {
                  setArrivals(day.dateString);
                } else if (datePickerField === "departures") {
                  setDepartures(day.dateString);
                }
                setDatePickerField(null);
              }}
              theme={{
                todayTextColor: brand.primary,
                arrowColor: brand.primary,
                selectedDayBackgroundColor: brand.primary,
                textSectionTitleColor: brand.claySoft,
              }}
            />
            <Pressable
              style={styles.modalClose}
              onPress={() => setDatePickerField(null)}
            >
              <Text style={styles.modalCloseText}>Κλείσιμο</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PropertiesList;

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);
  return StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
    backgroundColor: brand.sand,
  },
  homeHeader: {
    marginBottom: Spacing.three,
    paddingHorizontal: 2,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  homeEyebrow: {
    flex: 1,
    fontSize: s(12),
    fontWeight: "700",
    letterSpacing: 1.2,
    color: brand.primary,
  },
  homeTitle: {
    fontSize: s(28),
    fontWeight: "700",
    color: brand.ink,
    fontFamily: Fonts?.serif,
    lineHeight: s(34),
  },
  settingsButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: brand.primary,
    backgroundColor: brand.white,
  },
  settingsButtonText: {
    color: brand.primary,
    fontWeight: "700",
    fontSize: s(14),
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.two,
  },
  addInput: {
    flex: 1,
  },
  addSubmit: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: brand.sandDeep,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: s(14),
    color: brand.ink,
    backgroundColor: brand.white,
  },
  confirmButton: {
    backgroundColor: brand.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    color: brand.white,
    fontWeight: "700",
    fontSize: s(14),
  },
  flatList: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
  card: {
    padding: Spacing.two,
    backgroundColor: brand.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.sandDeep,
    gap: 6,
  },
  cardMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardText: {
    fontSize: s(16),
    fontWeight: "600",
    color: brand.ink,
  },
  cardHint: {
    fontSize: s(12),
    color: brand.claySoft,
  },
  muted: {
    color: brand.claySoft,
    fontSize: s(14),
  },
  deleteButton: {
    backgroundColor: brand.danger,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
  },
  deleteButtonText: {
    color: brand.white,
    fontWeight: "700",
    fontSize: s(12),
  },
  insightRow: {
    flexDirection: "row",
    gap: 6,
  },
  insightChip: {
    flex: 1,
    backgroundColor: brand.sand,
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: "center",
    borderWidth: 1,
    borderColor: brand.primary,
  },
  insightChipText: {
    color: brand.primary,
    fontWeight: "600",
    fontSize: s(12),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(44, 36, 28, 0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalPanel: {
    backgroundColor: brand.white,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  modalTitle: {
    fontSize: s(18),
    fontWeight: "700",
    color: brand.ink,
    marginBottom: 2,
  },
  modalLine: {
    fontSize: s(14),
    color: brand.ink,
    lineHeight: s(20),
  },
  modalClose: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: brand.sandDeep,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  modalCloseText: {
    fontWeight: "700",
    color: brand.ink,
  },
  searchPanel: {
    marginTop: Spacing.two,
    backgroundColor: brand.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: brand.sandDeep,
    borderStyle: "dashed",
    padding: Spacing.two,
    gap: 6,
  },
  searchTitle: {
    fontSize: s(14),
    fontWeight: "700",
    color: brand.ink,
  },
  dateRow: {
    flexDirection: "row",
    gap: 6,
  },
  dateField: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  dateInput: {
    paddingRight: 36,
  },
  dateIconBtn: {
    position: "absolute",
    right: 8,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  dateIconText: {
    fontSize: s(16),
  },
  searchButton: {
    backgroundColor: brand.primary,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  searchButtonText: {
    color: brand.white,
    fontWeight: "700",
    fontSize: s(14),
  },
  alertBanner: {
    backgroundColor: brand.danger,
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  alertText: {
    color: brand.white,
    fontSize: s(14),
  },
});
}

