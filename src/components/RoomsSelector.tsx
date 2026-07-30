import { Brand } from "@/constants/theme";
import { useState, useEffect, useCallback } from "react";
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
            placeholderTextColor={Brand.claySoft}
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

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  addButton: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Brand.primary,
    alignItems: "center",
  },
  addButtonText: {
    color: Brand.white,
    fontSize: 15,
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
    borderColor: Brand.sandDeep,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: Brand.white,
    color: Brand.ink,
  },
  confirmButton: {
    backgroundColor: Brand.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmText: {
    color: Brand.white,
    fontWeight: "600",
  },
  cancelText: {
    color: Brand.claySoft,
  },
});

export default RoomsSelector;
