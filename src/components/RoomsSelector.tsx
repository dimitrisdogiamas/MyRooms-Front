import { Brand } from '@/constants/theme';
import { useState, useEffect, useCallback } from 'react';
import { Pressable, View, StyleSheet, TextInput } from 'react-native';
import { ThemedText } from './themed-text';
import { supabase } from '@/lib/supabase';

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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [adding, setAdding] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('property_id', propertyId);
    if (error) {
      console.error('Error fetching rooms:', error);
    }
    setRooms(data ?? []);

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
      .from('rooms')
      .insert([{ name: newRoomName, property_id: propertyId }]);
    if (error) {
      console.error('Error adding room:', error);
    }
    setNewRoomName('');
    setAdding(false);
    await fetchRooms();
    onRoomsChanged?.();
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.tabRow}>
        {rooms.map((room) => {
          const isActive = room.id === selectedRoom?.id;
          return (
            <Pressable
              key={room.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onSelectRoom(room)}
            >
              <ThemedText
                style={[styles.tabText, isActive && styles.tabTextActive]}
              >
                {room.name}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <Pressable style={styles.addButton} onPress={() => setAdding(true)}>
        <ThemedText style={styles.addButtonText}>+ Δωμάτιο</ThemedText>
      </Pressable>

      {adding && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Όνομα Δωματίου"
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
              setNewRoomName('');
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
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: Brand.sandDeep,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  tab: {
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Brand.white,
  },
  tabText: {
    color: Brand.claySoft,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Brand.ink,
    fontWeight: '700',
  },
  addButton: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Brand.gold,
  },
  addButtonText: {
    color: Brand.white,
    fontSize: 14,
    fontWeight: '700',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: Brand.clay,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmText: {
    color: Brand.white,
    fontWeight: '600',
  },
  cancelText: {
    color: Brand.claySoft,
  },
});

export default RoomsSelector;
