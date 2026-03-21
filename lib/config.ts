import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

export function getApiBaseUrl(): string {
  const url = extra?.apiUrl?.replace(/\/$/, '');
  if (url) return url;
  return 'https://healthylifetrackerapp.vercel.app';
}
