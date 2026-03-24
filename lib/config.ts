import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;

function detectApiFromExpoHost(): string | null {
  const candidates: Array<string | undefined> = [
    // Common in Expo Go / dev environments.
    (Constants.expoConfig as { hostUri?: string } | null)?.hostUri,
    (Constants as unknown as { manifest?: { debuggerHost?: string } }).manifest?.debuggerHost,
    (
      Constants as unknown as {
        manifest2?: { extra?: { expoGo?: { debuggerHost?: string } } };
      }
    ).manifest2?.extra?.expoGo?.debuggerHost,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const host = candidate.split(':')[0]?.trim();
    if (!host) continue;
    return `http://${host}:3005`;
  }
  return null;
}

export function getApiBaseUrl(): string {
  const url = extra?.apiUrl?.replace(/\/$/, '');
  if (url) return url;
  return detectApiFromExpoHost() || 'https://healthylifetrackerapp.vercel.app';
}

export function getApiBaseUrlCandidates(): string[] {
  const configured = extra?.apiUrl?.replace(/\/$/, '');
  const inferred = detectApiFromExpoHost();
  const defaults = ['https://healthylifetrackerapp.vercel.app', 'http://localhost:3005'];
  const all = [configured, inferred, ...defaults].filter((v): v is string => Boolean(v));
  return Array.from(new Set(all));
}
