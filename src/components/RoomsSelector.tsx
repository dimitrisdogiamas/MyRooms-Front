import { type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { fs } from "@/lib/typography";
import { supabase } from "@/lib/supabase";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ThemedText } from "./themed-text";

export type Room = {
  id: string;
  name: string;
};

type RoomsSelectorProps = {
  propertyId: string;
  selectedRoom: Room | null;
  onSelectRoom: (room: Room) => void;
  onRoomsChanged?: () => void;
  /** Compact style for header action row */
  compact?: boolean;
};

const RoomsSelector = ({
  propertyId,
  selectedRoom,
  onSelectRoom,
  onRoomsChanged,
  compact = false,
}: RoomsSelectorProps) => {
  const [adding, setAdding] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

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
    <View style={[styles.wrapper, compact && styles.wrapperCompact]}>
      {!adding ? (
        <Pressable
          style={[styles.addButton, compact && styles.addButtonCompact]}
          onPress={() => setAdding(true)}
        >
          {compact ? (
            <Text style={styles.addButtonTextCompact}>
              + Προσθήκη δωματίου
            </Text>
          ) : (
            <ThemedText style={styles.addButtonText}>
              + Προσθήκη δωματίου
            </ThemedText>
          )}
        </Pressable>
      ) : (
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
            <ThemedText style={styles.cancelText}>×</ThemedText>
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
    wrapperCompact: {
      flex: 1,
      minWidth: 0,
      marginBottom: 0,
    },
    addButton: {
      width: "100%",
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: brand.primary,
      alignItems: "center",
    },
    addButtonCompact: {
      backgroundColor: "rgba(255, 255, 255, 0.12)",
      borderWidth: 1,
      borderColor: "rgba(255, 255, 255, 0.28)",
      borderRadius: 7,
      paddingVertical: 4,
      paddingHorizontal: 2,
      justifyContent: "center",
      alignItems: "center",
    },
    addButtonText: {
      color: brand.white,
      fontSize: s(15),
      fontWeight: "700",
    },
    addButtonTextCompact: {
      color: "#F1EFE6",
      fontSize: 11.5,
      lineHeight: 14,
      fontWeight: "600",
    },
    addRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 0,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: "#ffffff",
      color: brand.ink,
    },
    confirmButton: {
      backgroundColor: brand.primary,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
    },
    confirmText: {
      color: "#ffffff",
      fontWeight: "600",
    },
    cancelText: {
      color: "#9aa9a8",
    },
  });
}

export default RoomsSelector;
