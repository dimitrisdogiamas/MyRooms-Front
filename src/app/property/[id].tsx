import { Brand } from '@/constants/theme';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { Calendar } from 'react-native-calendars';
import { supabase } from '@/lib/supabase';
import RoomsSelector from '@/components/RoomsSelector';
import { Room } from '@/components/RoomsSelector';
import { Booking, BookingsList } from '@/components/BookingsList';

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
  return date.toISOString().split('T')[0];
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
          iso === booking.end_date ? Brand.calendarTurnover : Brand.calendarBlue,
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
  const [selectStartDate, setSelectStartDate] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomAvailability, setRoomAvailability] = useState<RoomsAvailability>(
    {},
  );
  const [rooms, setRooms] = useState<Room[]>([]);
  const [propertyName, setPropertyName] = useState('Κράτηση');
  const { id: propertyId } = useLocalSearchParams<{ id: string }>();

  const fetchPropertyData = useCallback(async () => {
    setLoading(true);

    const { data: property } = await supabase
      .from('properties')
      .select('name')
      .eq('id', propertyId)
      .maybeSingle();

    if (property?.name) {
      setPropertyName(property.name);
    }

    const { data: roomData, error: roomsError } = await supabase
      .from('rooms')
      .select('*')
      .eq('property_id', propertyId);

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
      setRooms([]);
      setBookings([]);
      setRoomAvailability({});
      setLoading(false);
      return;
    }

    const nextRooms = roomData ?? [];
    setRooms(nextRooms);

    const roomIds = nextRooms.map((room) => room.id);
    if (roomIds.length === 0) {
      setBookings([]);
      setRoomAvailability({});
      setLoading(false);
      return;
    }

    const { data: bookingData, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, room_id, start_date, end_date')
      .in('room_id', roomIds)
      .order('start_date', { ascending: true });

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      setBookings([]);
      setRoomAvailability({});
    } else {
      const nextBookings = bookingData ?? [];
      setBookings(nextBookings);
      setRoomAvailability(buildAvailabilityFromBookings(nextBookings));
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
      .from('bookings')
      .select('id')
      .eq('room_id', room)
      .lt('start_date', endDate)
      .gt('end_date', startDate);

    if (error) {
      console.error('Error checking overlap:', error);
      return false;
    }

    return (data ?? []).length > 0;
  }

  async function handleDayPress(dateString: string) {
    if (!selectStartDate) {
      setSelectStartDate(dateString);
      return;
    }

    const startDate = new Date(selectStartDate);
    const endDate = new Date(dateString);
    const diffDates =
      Math.round(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;

    if (diffDates < 5) {
      alert('Η κράτηση πρέπει να είναι τουλάχιστον 5 ημέρες.');
      setSelectStartDate(null);
      return;
    }

    if (!selectedRoom?.id) return;

    const isOverlap = await overlapCheck(
      selectStartDate,
      dateString,
      selectedRoom.id,
    );
    if (isOverlap) {
      alert(
        'Η επιλεγμένη περίοδος επικαλύπτεται με υπάρχουσα κράτηση. Παρακαλώ επιλέξτε άλλη περίοδο.',
      );
      setSelectStartDate(null);
      return;
    }

    const { error } = await supabase.from('bookings').insert([
      {
        room_id: selectedRoom.id,
        start_date: selectStartDate,
        end_date: dateString,
      },
    ]);

    if (error) {
      alert('Σφάλμα κατά την αποθήκευση της κράτησης: ' + error.message);
      setSelectStartDate(null);
      return;
    }

    setSelectStartDate(null);
    setRefreshKey((prev) => prev + 1);
  }

  const markedDates = selectedRoom
    ? {
        ...(roomAvailability[selectedRoom.id] ?? {}),
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
      }
    : {};

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{ title: propertyName, headerTintColor: Brand.clay }}
      />
      <ImageBackground
        source={require('@/assets/images/licensed-image.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.dim} />
        <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <Text style={styles.heroEyebrow}>Mel&Dim Resort</Text>
              <Text style={styles.heroTitle}>{propertyName}</Text>
              <Text style={styles.heroSubtitle}>
                {selectedRoom
                  ? `Δωμάτιο: ${selectedRoom.name}`
                  : 'Επίλεξε δωμάτιο για κράτηση'}
              </Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Δωμάτια</Text>
              <RoomsSelector
                propertyId={propertyId}
                selectedRoom={selectedRoom}
                onSelectRoom={setSelectedRoom}
              />
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Ημερολόγιο</Text>
              <Text style={styles.hint}>
                {selectStartDate
                  ? `Έναρξη: ${selectStartDate} — πάτα ημερομηνία λήξης (min 5 μέρες)`
                  : 'Πάτα ημερομηνία έναρξης, μετά ημερομηνία λήξης'}
              </Text>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.dot, { backgroundColor: Brand.calendarBlue }]}
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

              <Calendar
                markingType="period"
                style={styles.calendar}
                theme={{
                  backgroundColor: Brand.white,
                  calendarBackground: Brand.white,
                  textSectionTitleColor: Brand.claySoft,
                  selectedDayBackgroundColor: Brand.gold,
                  todayTextColor: Brand.goldDark,
                  dayTextColor: Brand.ink,
                  arrowColor: Brand.clay,
                  monthTextColor: Brand.ink,
                  textMonthFontWeight: '700',
                }}
                current={'2026-07-18'}
                markedDates={markedDates}
                onDayPress={(day) => {
                  handleDayPress(day.dateString);
                }}
              />
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Κρατήσεις</Text>
              <BookingsList
                bookings={bookings}
                loading={loading}
                onCancelled={fetchPropertyData}
                rooms={rooms}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </ImageBackground>
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
    backgroundColor: 'rgba(44, 36, 28, 0.45)',
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
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroTitle: {
    color: Brand.white,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
  },
  panel: {
    backgroundColor: Brand.sand,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Brand.sandDeep,
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.ink,
    marginBottom: 10,
  },
  hint: {
    fontSize: 13,
    color: Brand.claySoft,
    marginBottom: 12,
    lineHeight: 18,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
});
