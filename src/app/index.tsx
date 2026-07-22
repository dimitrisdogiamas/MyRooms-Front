import * as Device from 'expo-device';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { AnimatedIcon } from '@/components/animated-icon';
import { HintRow } from '@/components/hint-row';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebBadge } from '@/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { Calendar, CalendarList, Agenda } from 'react-native-calendars';
import { Pressable } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import RoomsSelector from '@/components/RoomsSelector';
import { RoomKey } from '@/components/RoomsSelector';
import { ImageBackground } from 'react-native';
import { BookingsList } from '@/components/BookingsList';

type RoomAvailability = {
  [dateString: string]: {
    color: string;
    textColor: string;
    startingDay?: boolean;
    endingDay?: boolean;
  }
}

type RoomsAvailability = {
  room1: RoomAvailability;
  room2: RoomAvailability;
};

function getDevMenuHint() {
  if (Platform.OS === 'web') {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === 'android' ? 'cmd+m (or ctrl+m)' : 'cmd+d';
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  const [selectedRoom, setSelectedRoom] = useState<RoomKey>('room1');
  const [selectStartDate, setSelectStartDate] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // availability of each room 
  const [roomAvailability, setRoomAvailability] = useState<RoomsAvailability>({
    room1: {},
    room2: {},
  });


  async function handleDayPress(dateString: string) {
    if (!selectStartDate) {
      setSelectStartDate(dateString);
      return;
    }

    // second tap calculate the range and mark the dates
    const startDate = new Date(selectStartDate);
    const endDate = new Date(dateString);
    const diffDates = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;


    if (diffDates < 5) {
      alert("Η κράτηση πρέπει να είναι τουλάχιστον 5 ημέρες.");
      setSelectStartDate(null);
      return;
    }

    // supabase connection 
    const { error } = await supabase.from('bookings').insert([{
      room_id: selectedRoom,
      start_date: selectStartDate,
      end_date: dateString
    }]);

    if (error) {
      alert("Σφάλμα κατά την αποθήκευση της κράτησης: " + error.message);
      setSelectStartDate(null);
      return;
    }

    //valid range 
    const newMarkedDates: RoomAvailability = {};

    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const iso = currentDate.toISOString().split('T')[0];
      newMarkedDates[iso] = {
        color: '#e74c3c',
        textColor: '#ffffff',
        startingDay: iso === selectStartDate,
        endingDay: iso === dateString,
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setRoomAvailability((prev) => ({
      ...prev,
      [selectedRoom]: {
        ...prev[selectedRoom],
        ...newMarkedDates,
      },
    }));

    setRefreshKey((prev) => prev + 1); // trigger re-render

    setSelectStartDate(null);
  }

  return (
      <ImageBackground 
        source={require('@/assets/images/licensed-image.jpg')}
        style={styles.backgroundImage}
    resizeMode="cover"
    >
      <SafeAreaView>
        <ThemedText>
          Welcome to {`Mel&Dim Resort`}
        </ThemedText>
      
        <RoomsSelector selectedRoom={selectedRoom} onSelectRoom={setSelectedRoom} />

        <Calendar
          markingType="period"
          style={styles.Calendar}
          current={'2026-07-18'}
          markedDates={roomAvailability[selectedRoom]}
          onDayPress={(day) => { handleDayPress(day.dateString) }}
        >
        
        </Calendar>

        <ThemedText style={{ marginTop: 20, marginBottom: 8, fontWeight: '700' }}>
          Οι κρατήσεις σας 
        </ThemedText>
        <BookingsList  refreshKey={refreshKey} />

      </SafeAreaView>
      </ImageBackground>
    );
  }


  const styles = StyleSheet.create({
    SafeAreaView: {
      flex: 1,
      padding: 16,
      backgroundColor: '#fff',
    },
    Calendar: {
      width: '100%',
      height: 350,
      alignSelf: 'center',
    },
    backgroundImage: {
      flex: 1,
      resizeMode: 'cover',
    },
  });