import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Notifications } from './notificationsApi';

export type PersonalTrackCategory = 'diet' | 'quit' | 'running' | 'custom';

export type PersonalTrack = {
  id: string;
  title: string;
  category: PersonalTrackCategory;
  targetPerWeek: number;
  reminderEnabled: boolean;
  reminderTime: string; // HH:MM
  note?: string;
  completedDates: string[]; // YYYY-MM-DD
  notificationId?: string;
  createdAt: string;
};

const TRACKS_KEY = '@personal_tracks';

export async function getPersonalTracks(): Promise<PersonalTrack[]> {
  try {
    const raw = await AsyncStorage.getItem(TRACKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function savePersonalTracks(tracks: PersonalTrack[]): Promise<void> {
  await AsyncStorage.setItem(TRACKS_KEY, JSON.stringify(tracks));
}

export function toDateKey(d: Date = new Date()): string {
  return d.toISOString().split('T')[0];
}

export function getTrackStreak(track: PersonalTrack): number {
  const completed = new Set(track.completedDates);
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    if (completed.has(key)) streak++;
    else break;
  }
  return streak;
}

export function getTrackLast7(track: PersonalTrack): number {
  const completed = new Set(track.completedDates);
  const now = new Date();
  let count = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    if (completed.has(toDateKey(d))) count++;
  }
  return count;
}

export async function scheduleTrackReminder(track: PersonalTrack): Promise<string | undefined> {
  if (!track.reminderEnabled) return undefined;
  if (Platform.OS === 'web') return undefined;
  try {
    const [h, m] = track.reminderTime.split(':');
    const hour = Math.max(0, Math.min(23, parseInt(h || '20', 10)));
    const minute = Math.max(0, Math.min(59, parseInt(m || '0', 10)));
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${track.title}`,
        body: `Time to complete your ${track.category} track.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
      },
    });
    return id;
  } catch {
    return undefined;
  }
}

export async function cancelTrackReminder(notificationId?: string): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

