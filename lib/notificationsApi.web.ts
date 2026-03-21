/** Web stub — real scheduling runs only on native. */
export const Notifications = {
  SchedulableTriggerInputTypes: { DAILY: 'daily' as const },
  async scheduleNotificationAsync(): Promise<string> {
    return '';
  },
  async cancelScheduledNotificationAsync(): Promise<void> {
    return;
  },
};
