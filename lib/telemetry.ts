import AsyncStorage from '@react-native-async-storage/async-storage';

const EVENTS_KEY = '@telemetry_events';

export type AnalyticsEventName =
  | 'habit_created'
  | 'habit_completed'
  | 'habit_missed'
  | 'streak_saved'
  | 'screen_view';

export type AnalyticsEvent = {
  event_name: AnalyticsEventName;
  distinct_id: string;
  timestamp: string;
  properties: Record<string, string | number | boolean | null | undefined>;
};

async function getDistinctId(): Promise<string> {
  const key = '@distinct_id';
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const id = `usr-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  await AsyncStorage.setItem(key, id);
  return id;
}

export async function trackEvent(
  event_name: AnalyticsEventName,
  properties: AnalyticsEvent['properties'] = {}
): Promise<void> {
  try {
    const distinct_id = await getDistinctId();
    const payload: AnalyticsEvent = {
      event_name,
      distinct_id,
      timestamp: new Date().toISOString(),
      properties: {
        platform: 'mobile',
        app_version: '1.0.0',
        offline_status: true,
        ...properties,
      },
    };

    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    const queue: AnalyticsEvent[] = raw ? JSON.parse(raw) : [];
    queue.push(payload);
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(queue));
  } catch {
    // Analytics must never block habit execution.
  }
}

