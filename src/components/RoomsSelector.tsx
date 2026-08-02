import { type BrandColors } from "@/constants/theme";
import { useState, useEffect, useCallback, useMemo } from "react";
import { fs } from "@/lib/typography";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { Pressable, View, StyleSheet, TextInput } from "react-native";
import { ThemedText } from "./themed-text";
import { supabase } from "@/lib/supabase";

export type Room = {
  id: string;
  name: string;
};

type RoomsSelectorProps = {
  propertyId: string;
  selectedRoom: Room | null;
  onSelectRoom: (room: Room) => void;
  onRoomsChanged?: () => void;
};

const RoomsSelector = ({
  propertyId,
  selectedRoom,
  onSelectRoom,
  onRoomsChanged,
}: RoomsSelectorProps) => {
  const [adding, setAdding] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(() => createStyles(settings.fontScale, brand), [settings.fontScale, brand]);

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("property_id", propertyId);
    if (error) {
      console.error("Error fetching rooms:", error);
      return;
    }

    if (!selectedRoom && data && data.length > 0) {
      onSelectRoom(data[0]);
    }
  }, [selectedRoom, onSelectRoom, propertyId]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  async function addRoom() {
    if (!newRoomName.trim()) return;
    const { error } = await supabase
      .from("rooms")
      .insert([{ name: newRoomName.trim(), property_id: propertyId }]);
    if (error) {
      console.error("Error adding room:", error);
    }
    setNewRoomName("");
    setAdding(false);
    await fetchRooms();
    onRoomsChanged?.();
  }

  return (
    <View style={styles.wrapper}>
      <Pressable style={styles.addButton} onPress={() => setAdding(true)}>
        <ThemedText style={styles.addButtonText}>+ Προσθήκη δωματίου</ThemedText>
      </Pressable>

      {adding && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Ταμπέλα δωματίου (π.χ. 101)"
            placeholderTextColor={brand.claySoft}
            value={newRoomName}
            onChangeText={setNewRoomName}
            autoFocus
          />
          <Pressable style={styles.confirmButton} onPress={addRoom}>
            <ThemedText style={styles.confirmText}>OK</ThemedText>
          </Pressable>
          <Pressable
            onPress={() => {
              setAdding(false);
              setNewRoomName("");
            }}
          >
            <ThemedText style={styles.cancelText}>Ακύρωση</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
};

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);
  return StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  addButton: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: brand.primary,
    alignItems: "center",
  },
  addButtonText: {
    color: brand.white,
    fontSize: s(15),
    fontWeight: "700",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: brand.sandDeep,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: brand.white,
    color: brand.ink,
  },
  confirmButton: {
    backgroundColor: brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmText: {
    color: brand.white,
    fontWeight: "600",
  },
  cancelText: {
    color: brand.claySoft,
  },
});
}


export default RoomsSelector;
