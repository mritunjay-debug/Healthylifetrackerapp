import Constants from 'expo-constants';
import { Platform } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo';

export function configureNotificationModule(): void {
  if (Platform.OS === 'web' || isExpoGo) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // non-blocking for unsupported environments
  }
}

export async function requestNotificationPermissionsAndChannel(): Promise<void> {
  if (Platform.OS === 'web' || isExpoGo) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Notifications = require('expo-notifications');
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  } catch {
    // non-blocking
  }
}
