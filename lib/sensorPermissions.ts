import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';

export type SensorPermissionStatus = {
  pedometer: 'granted' | 'denied' | 'unavailable';
};

export async function requestAllSensorPermissions(): Promise<SensorPermissionStatus> {
  if (Platform.OS === 'web') {
    return { pedometer: 'unavailable' };
  }
  try {
    const available = await Pedometer.isAvailableAsync();
    if (!available) return { pedometer: 'unavailable' };
    const current = await Pedometer.getPermissionsAsync();
    if (current.granted || current.status === 'granted') {
      return { pedometer: 'granted' };
    }
    const next = await Pedometer.requestPermissionsAsync();
    return { pedometer: next.granted || next.status === 'granted' ? 'granted' : 'denied' };
  } catch {
    return { pedometer: 'denied' };
  }
}
