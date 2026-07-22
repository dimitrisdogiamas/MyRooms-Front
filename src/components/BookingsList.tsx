import { useState } from 'react';
import { useEffect } from 'react';
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ThemedText } from './themed-text';
import { FlatList, View } from 'react-native';
import { Pressable , StyleSheet} from 'react-native';

type Booking = {
  id: string;
  room: string;
  startDate: string;
  endDate: string;
}

type BookingsListProps = {
  refreshKey: number;
};


export const BookingsList = ({ refreshKey }: BookingsListProps) => {

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(true);


  // fetch bookings from supabase when the refreshKey changes
  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('bookings').select('*').order('start_date', { ascending: true });
    if (error) {
      console.error('Error fetching bookings:', error);
    } else {
      setBookings(data);
    }
    setLoading(false);
  }, []);

  // refetch bookings when the refreshKey changes
  useEffect(() => {
    fetchBookings();

  }, [fetchBookings, refreshKey]);


  async function handleCancel(id: string) {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) {
      console.error('Error cancelling booking:', error);
    } else {
      // refetch bookings after cancellation
      fetchBookings();
    }
  }

  if (loading) {
    return <ThemedText>Φόρτωση Κρατήσεων...</ThemedText>;
  }

  if (bookings.length === 0) {
    return <ThemedText>Δεν υπάρχουν κρατήσεις.</ThemedText>;
  }

  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View>
        <View style={styles.row}>
          <ThemedText>
            {item.id === 'room1' ? 'Δωμάτιο 1' : 'Δωμάτιο 2'}
          </ThemedText>
          <ThemedText>
            {item.startDate} - {item.endDate}
          </ThemedText>
        </View>
        <Pressable style={styles.cancelButton} onPress={() => handleCancel(item.id)}>
          <ThemedText style={styles.cancelText}>Ακύρωση</ThemedText>
        </Pressable>
        </View>
      )}
    >
    </FlatList>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    },
  roomLabel: {
    fontWeight: '600',
  },
  dates: {
    color: '#666',
    fontSize: 13,
  },

  cancelButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e74c3c',
    borderRadius: 6,
  },

  cancelText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  }
  })