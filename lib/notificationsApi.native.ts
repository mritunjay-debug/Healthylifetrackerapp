import Constants from 'expo-constants';
import type * as ExpoNotifications from 'expo-notifications';

/** Expo Go (SDK 53+) does not load remote push; avoid importing the native module so it won’t log errors. */
const expoGoStub = {
  SchedulableTriggerInputTypes: { DAILY: 'daily' as const },
  async scheduleNotificationAsync(): Promise<string> {
    return '';
  },
  async cancelScheduledNotificationAsync(): Promise<void> {
    return;
  },
} as unknown as typeof import('expo-notifications');

export const Notifications: typeof ExpoNotifications =
  Constants.appOwnership === 'expo' ? expoGoStub : require('expo-notifications');
