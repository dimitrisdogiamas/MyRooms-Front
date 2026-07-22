import React from 'react';
import { useState } from 'react'
import { Pressable } from 'react-native';
import { View } from 'react-native';
import { ThemedText } from './themed-text';
import { StyleSheet } from 'react-native';

// define the type for the props

export type RoomKey = 'room1' | 'room2';

type RoomsSelectorProps = {
  selectedRoom: RoomKey;
  onSelectRoom: (room: RoomKey) => void;
};

const Rooms: { key: RoomKey, label: string }[] = [
  { key: 'room1', label: 'Room 1' },
  { key: 'room2', label: 'Room 2' },
];


const RoomsSelector = ({ selectedRoom, onSelectRoom }: RoomsSelectorProps) => {
  return (
    <View style={styles.tabRow}>
      {Rooms.map((room) => {
        const isActive = room.key === selectedRoom;
        return (
          <Pressable
            key={room.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelectRoom(room.key)}
          >
            <ThemedText style={[styles.tabText, isActive && styles.tabTextActive]}>
              {room.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 4,
    marginBottom: 16,
  },

  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
  },
  tabText: {
    color: '#888',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#111',
    fontWeight: '700',
  },

});

  
export default RoomsSelector;