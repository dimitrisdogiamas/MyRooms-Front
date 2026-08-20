import { supabase } from "@/lib/supabase";
import { Alert, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

type ExportData = {
  version: 1;
  exportedAt: string;
  properties: unknown[];
  rooms: unknown[];
  bookings: unknown[];
  rooms_prices: unknown[];
  expenses: unknown[];
};

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message: unknown }).message;
    if (typeof msg === "string" && msg) return msg;
  }
  if (typeof err === "string" && err) return err;
  return fallback;
}

export async function exportAllData(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Δεν είσαι συνδεδεμένος");

  const [properties, rooms, bookings, prices, expenses] = await Promise.all([
    supabase.from("properties").select("*").eq("user_id", user.id),
    supabase.from("rooms").select("*"),
    supabase.from("bookings").select("*"),
    supabase.from("rooms_prices").select("*"),
    supabase.from("expenses").select("*"),
  ]);

  const queryError =
    properties.error ??
    rooms.error ??
    bookings.error ??
    prices.error ??
    expenses.error;
  if (queryError) throw queryError;

  const propertyIds = (properties.data ?? []).map((p: { id: string }) => p.id);

  const payload: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    properties: properties.data ?? [],
    rooms: (rooms.data ?? []).filter((r: { property_id: string }) =>
      propertyIds.includes(r.property_id),
    ),
    bookings: (bookings.data ?? []).filter((b: { room_id: string }) => {
      const room = (rooms.data ?? []).find(
        (r: { id: string; property_id: string }) =>
          r.id === b.room_id && propertyIds.includes(r.property_id),
      );
      return !!room;
    }),
    rooms_prices: (prices.data ?? []).filter((p: { room_id: string }) => {
      const room = (rooms.data ?? []).find(
        (r: { id: string; property_id: string }) =>
          r.id === p.room_id && propertyIds.includes(r.property_id),
      );
      return !!room;
    }),
    expenses: (expenses.data ?? []).filter((e: { property_id: string }) =>
      propertyIds.includes(e.property_id),
    ),
  };

  const json = JSON.stringify(payload, null, 2);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `my-rooms-backup-${date}.json`;

  if (!FileSystem.cacheDirectory) {
    await Share.share({ message: json, title: filename });
    return true;
  }

  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, json);

  // Prefer file sharing — Android Share.share({ message: hugeJson }) often fails.
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: "application/json",
      dialogTitle: filename,
      UTI: "public.json",
    });
  } else {
    await Share.share({ url: path, title: filename });
  }

  return true;
}

export async function importData(): Promise<boolean> {
  let DocumentPicker: typeof import("expo-document-picker") | null = null;
  let FileSystem: typeof import("expo-file-system/legacy") | null = null;
  try {
    DocumentPicker = require("expo-document-picker");
    FileSystem = require("expo-file-system/legacy");
  } catch {
    Alert.alert(
      "Μη διαθέσιμο",
      "Η εισαγωγή αρχείων δεν υποστηρίζεται σε Expo Go. Χρειάζεται development build.",
    );
    return false;
  }

  const result = await DocumentPicker!.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) return false;

  const picked = result.assets[0];
  const raw = await FileSystem!.readAsStringAsync(picked.uri);

  let data: ExportData;
  try {
    data = JSON.parse(raw);
  } catch {
    Alert.alert("Σφάλμα", "Το αρχείο δεν είναι έγκυρο JSON");
    return false;
  }

  if (data.version !== 1) {
    Alert.alert("Σφάλμα", "Μη συμβατή έκδοση αρχείου");
    return false;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Δεν είσαι συνδεδεμένος");

  const counts = {
    properties: data.properties?.length ?? 0,
    rooms: data.rooms?.length ?? 0,
    bookings: data.bookings?.length ?? 0,
    prices: data.rooms_prices?.length ?? 0,
    expenses: data.expenses?.length ?? 0,
  };

  return new Promise((resolve) => {
    Alert.alert(
      "Εισαγωγή δεδομένων",
      `Θα εισαχθούν:\n• ${counts.properties} ακίνητα\n• ${counts.rooms} δωμάτια\n• ${counts.bookings} κρατήσεις\n• ${counts.prices} τιμές\n• ${counts.expenses} έξοδα\n\nΤα υπάρχοντα δεδομένα δεν θα διαγραφούν.`,
      [
        { text: "Ακύρωση", style: "cancel", onPress: () => resolve(false) },
        {
          text: "Εισαγωγή",
          onPress: async () => {
            try {
              await doImport(data, user.id);
              Alert.alert("Επιτυχία", "Τα δεδομένα εισήχθησαν!");
              resolve(true);
            } catch (err) {
              Alert.alert("Σφάλμα", errorMessage(err, "Αποτυχία εισαγωγής"));
              resolve(false);
            }
          },
        },
      ],
    );
  });
}

async function doImport(data: ExportData, userId: string) {
  const oldToNewProperty = new Map<string, string>();
  const oldToNewRoom = new Map<string, string>();

  for (const prop of data.properties as { id: string; name: string }[]) {
    const { data: inserted, error } = await supabase
      .from("properties")
      .insert({ name: prop.name, user_id: userId })
      .select("id")
      .single();
    if (error) throw error;
    oldToNewProperty.set(prop.id, inserted.id);
  }

  for (const room of data.rooms as { id: string; name: string; property_id: string }[]) {
    const newPropId = oldToNewProperty.get(room.property_id);
    if (!newPropId) continue;
    const { data: inserted, error } = await supabase
      .from("rooms")
      .insert({ name: room.name, property_id: newPropId })
      .select("id")
      .single();
    if (error) throw error;
    oldToNewRoom.set(room.id, inserted.id);
  }

  const bookingRows = (data.bookings as {
    room_id: string;
    start_date: string;
    end_date: string;
    guest_name?: string;
    adults?: number;
    children?: number;
    departure_note?: string;
    deposit?: number;
    settlement?: number;
    phone?: string;
  }[])
    .map((b) => {
      const newRoomId = oldToNewRoom.get(b.room_id);
      if (!newRoomId) return null;
      return {
        room_id: newRoomId,
        start_date: b.start_date,
        end_date: b.end_date,
        guest_name: b.guest_name ?? null,
        adults: b.adults ?? 2,
        children: b.children ?? 0,
        departure_note: b.departure_note ?? null,
        deposit: b.deposit ?? null,
        settlement: b.settlement ?? null,
        phone: b.phone ?? null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (bookingRows.length) {
    const { error } = await supabase.from("bookings").insert(bookingRows);
    if (error) throw error;
  }

  const priceRows = (data.rooms_prices as {
    room_id: string;
    start_date: string;
    end_date: string;
    price_per_night: number;
  }[])
    .map((p) => {
      const newRoomId = oldToNewRoom.get(p.room_id);
      if (!newRoomId) return null;
      return {
        room_id: newRoomId,
        start_date: p.start_date,
        end_date: p.end_date,
        price_per_night: p.price_per_night,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (priceRows.length) {
    const { error } = await supabase.from("rooms_prices").insert(priceRows);
    if (error) throw error;
  }

  const expenseRows = (data.expenses as {
    property_id: string;
    amount: number;
    date: string;
    category?: string;
    note?: string;
  }[])
    .map((e) => {
      const newPropId = oldToNewProperty.get(e.property_id);
      if (!newPropId) return null;
      return {
        property_id: newPropId,
        amount: e.amount,
        date: e.date,
        category: e.category ?? "Άλλο",
        note: e.note ?? null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (expenseRows.length) {
    const { error } = await supabase.from("expenses").insert(expenseRows);
    if (error) throw error;
  }
}
