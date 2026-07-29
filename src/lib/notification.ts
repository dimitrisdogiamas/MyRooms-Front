import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {supabase} from './supabase';
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return null;

  const pushToken = await Notifications.getExpoPushTokenAsync();
  const { data, error } = await supabase.from('push_tokens').upsert({
    token: pushToken.data,
  }, {
    onConflict: 'token',
  });
  if (error) {
    console.error(error);
    return null;
  }
  return pushToken.data;



}

 Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    })
  })
