import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { getApiBaseUrlCandidates } from './config';

const PUSH_TOKEN_KEY = '@expo_push_token';

type PushStatus = {
  enabled: boolean;
  token?: string;
  reason?: string;
};

function loadNotificationsModule(): typeof import('expo-notifications') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch {
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function registerForPushNotifications(): Promise<PushStatus> {
  if (Platform.OS === 'web') {
    return { enabled: false, reason: 'Push is not supported on web here.' };
  }
  if (Constants.appOwnership === 'expo') {
    return {
      enabled: false,
      reason:
        'Remote push is not supported in Expo Go on SDK 53+. Use a development build for remote push.',
    };
  }

  const Notifications = loadNotificationsModule();
  if (!Notifications) {
    return { enabled: false, reason: 'Notification module unavailable in this runtime.' };
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted || existing.status === 'granted';
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      granted = requested.granted || requested.status === 'granted';
    }
    if (!granted) {
      return { enabled: false, reason: 'Notification permission denied.' };
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    if (!projectId) {
      return { enabled: false, reason: 'EAS projectId missing for push token.' };
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return { enabled: true, token };
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'Could not register push notifications.';
    return { enabled: false, reason };
  }
}

export async function sendLocalTestNotification(): Promise<void> {
  const Notifications = loadNotificationsModule();
  if (!Notifications) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'HealthTrack AI reminder',
      body: 'Your personalized coach is ready with today\'s plan.',
      sound: true,
    },
    trigger: null,
  });
}

export async function sendRemoteTestNotification(token: string): Promise<void> {
  const candidates = getApiBaseUrlCandidates();
  let lastError: Error | null = null;
  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/api/notifications/push-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { error?: string }) : {};
      if (!res.ok) {
        throw new Error(data.error || `Push test failed (${res.status})`);
      }
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Push test failed');
    }
  }
  throw (
    lastError ||
    new Error('Could not reach backend for push test. Ensure server is running and API URL is reachable.')
  );
}

export async function sendRemoteReminderForSelf(accessToken: string): Promise<void> {
  const candidates = getApiBaseUrlCandidates();
  let lastError: Error | null = null;
  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/api/notifications/send-self`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({}),
      });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as { error?: string }) : {};
      if (!res.ok) throw new Error(data.error || `Self reminder failed (${res.status})`);
      return;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error('Self reminder failed');
    }
  }
  throw lastError ?? new Error('Could not reach backend to send self reminder');
}
