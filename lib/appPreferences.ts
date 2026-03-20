import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppPreferences = {
  countryCode: 'IN' | 'US' | 'UK' | 'CA' | 'AU' | 'OTHER';
  currencySymbol: string;
  weightUnit: 'kg' | 'lb';
  distanceUnit: 'km' | 'mi';
  dailyWisdomEnabled: boolean;
  quitMorningTime: string; // HH:MM
  dietAfternoonTime: string; // HH:MM
  runningEveningTime: string; // HH:MM
};

const KEY = '@app_preferences';

export const defaultPreferences: AppPreferences = {
  countryCode: 'IN',
  currencySymbol: '₹',
  weightUnit: 'kg',
  distanceUnit: 'km',
  dailyWisdomEnabled: false,
  quitMorningTime: '08:00',
  dietAfternoonTime: '13:00',
  runningEveningTime: '19:00',
};

export async function getAppPreferences(): Promise<AppPreferences> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...defaultPreferences, ...JSON.parse(raw) } : defaultPreferences;
  } catch {
    return defaultPreferences;
  }
}

export async function saveAppPreferences(next: AppPreferences): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export function getUnitDefaultsByCountry(countryCode: AppPreferences['countryCode']): Pick<AppPreferences, 'weightUnit' | 'distanceUnit' | 'currencySymbol'> {
  switch (countryCode) {
    case 'US':
      return { weightUnit: 'lb', distanceUnit: 'mi', currencySymbol: '$' };
    case 'UK':
      return { weightUnit: 'kg', distanceUnit: 'mi', currencySymbol: '£' };
    case 'CA':
      return { weightUnit: 'kg', distanceUnit: 'km', currencySymbol: 'C$' };
    case 'AU':
      return { weightUnit: 'kg', distanceUnit: 'km', currencySymbol: 'A$' };
    case 'IN':
      return { weightUnit: 'kg', distanceUnit: 'km', currencySymbol: '₹' };
    default:
      return { weightUnit: 'kg', distanceUnit: 'km', currencySymbol: '₹' };
  }
}

