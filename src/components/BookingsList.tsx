import { supabase } from '@/lib/supabase';
import { ThemedText } from './themed-text';
import { FlatList, View, Pressable, StyleSheet } from 'react-native';
import type { Room } from './RoomsSelector';
import { type BrandColors } from '@/constants/theme';
import { useMemo, useState } from 'react';
import { fs } from '@/lib/typography';
import { useSettings } from '@/context/SettingsProvider';
import { useBrand } from '@/hooks/use-brand';

export type Booking = {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  /** Σημείωση αναχώρησης / πρόωρης εξόδου */
  departure_note?: string | null;
};

export type BookingsListProps = {
  bookings: Booking[];
  loading: boolean;
  onCancelled: () => void;
  rooms: Room[];
  departure_note?: string | null;
};

export const BookingsList = ({
  bookings,
  loading,
  onCancelled,
  rooms,
  departure_note,
}: BookingsListProps) => {

  const [departureNote, setDepartureNote] = useState<string | null>();
  const [noteText, setNoteText] = useState<string>('');
  const { settings } = useSettings();
  const brand = useBrand();
  const styles = useMemo(() => createStyles(settings.fontScale, brand), [settings.fontScale, brand]);
  



  function getRoomName(roomId: string) {
    return rooms.find((room) => room.id === roomId)?.name ?? '—';
  }

  async function handleCancel(id: string) {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) {
      console.error('Error cancelling booking:', error);
    } else {
      onCancelled();
    }
  }

  if (loading) {
    return <ThemedText style={styles.muted}>Φόρτωση Κρατήσεων...</ThemedText>;
  }

  if (bookings.length === 0) {
    return <ThemedText style={styles.muted}>Δεν υπάρχουν κρατήσεις.</ThemedText>;
  }

  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <ThemedText style={styles.roomLabel}>
              {getRoomName(item.room_id)}
            </ThemedText>
            <ThemedText style={styles.dates}>
              {item.start_date} – {item.end_date}
            </ThemedText>
          </View>
          <Pressable
            style={styles.cancelButton}
            onPress={() => handleCancel(item.id)}
          >
            <ThemedText style={styles.cancelText}>Ακύρωση</ThemedText>
          </Pressable>
        </View>
      )}
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
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  roomLabel: {
    fontWeight: '700',
    color: brand.ink,
    flexShrink: 1,
  },
  dates: {
    color: brand.claySoft,
    fontSize: s(13),
  },
  cancelButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: brand.danger,
    borderRadius: 8,
  },
  cancelText: {
    color: brand.white,
    fontSize: s(13),
    fontWeight: '600',
  },
});
}

