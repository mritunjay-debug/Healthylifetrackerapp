import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Notifications } from './notificationsApi';
import { getAllWisdomEntries, WisdomCategory } from './wisdomLibrary';

const DAILY_WISDOM_NOTIFICATION_IDS = '@daily_wisdom_notification_ids';

function pickMessageByCategory(category: WisdomCategory, dayIndex: number, all: Awaited<ReturnType<typeof getAllWisdomEntries>>): string {
  const bucket = all.filter((e) => e.category === category || e.category === 'general');
  if (bucket.length === 0) return 'Consistency compounds. Take one meaningful action now.';
  return bucket[dayIndex % bucket.length].text;
}

export async function scheduleCategoryWisdomNotifications(times: {
  quitMorning: string;
  dietAfternoon: string;
  runningEvening: string;
}): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelDailyWisdomNotification();
  const parseTime = (t: string, fallbackH: number) => {
    const [h, m] = t.split(':');
    return {
      hour: Math.max(0, Math.min(23, parseInt(h || String(fallbackH), 10))),
      minute: Math.max(0, Math.min(59, parseInt(m || '0', 10))),
    };
  };

  const dayIndex = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  const all = await getAllWisdomEntries();
  const slots: Array<{ category: WisdomCategory; title: string; time: { hour: number; minute: number } }> = [
    { category: 'quit', title: 'Quit Focus', time: parseTime(times.quitMorning, 8) },
    { category: 'diet', title: 'Diet Focus', time: parseTime(times.dietAfternoon, 13) },
    { category: 'running', title: 'Running Focus', time: parseTime(times.runningEvening, 19) },
  ];

  const ids: string[] = [];
  for (const slot of slots) {
    const message = pickMessageByCategory(slot.category, dayIndex, all);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: slot.title,
        body: message,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: slot.time.hour,
        minute: slot.time.minute,
      },
    });
    ids.push(id);
  }
  await AsyncStorage.setItem(DAILY_WISDOM_NOTIFICATION_IDS, JSON.stringify(ids));
}

export async function cancelDailyWisdomNotification(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(DAILY_WISDOM_NOTIFICATION_IDS);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    for (const id of ids) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    await AsyncStorage.removeItem(DAILY_WISDOM_NOTIFICATION_IDS);
  } catch {
    // ignore
  }
}

