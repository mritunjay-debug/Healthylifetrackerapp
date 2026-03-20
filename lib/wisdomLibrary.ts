import AsyncStorage from '@react-native-async-storage/async-storage';

export type WisdomCategory = 'quit' | 'running' | 'diet' | 'general';
export type WisdomEntry = {
  id: string;
  text: string;
  category: WisdomCategory;
};

const WISDOM_CUSTOM_KEY = '@wisdom_custom_entries';

const defaultBase: Array<{ text: string; category: WisdomCategory }> = [
  { text: 'Urges are temporary. Delay 2 minutes and breathe deeply.', category: 'quit' },
  { text: 'Prepare your trigger plan before stress arrives.', category: 'quit' },
  { text: 'Hydration first, cravings second.', category: 'quit' },
  { text: 'Easy pace is still progress. Start with 10 minutes.', category: 'running' },
  { text: 'Consistency in running beats one heroic workout.', category: 'running' },
  { text: 'Warm up before speed to protect joints.', category: 'running' },
  { text: 'Protein + fiber keeps hunger and crashes lower.', category: 'diet' },
  { text: 'Plan meals before the day gets chaotic.', category: 'diet' },
  { text: 'Track intake without judgment, then adjust.', category: 'diet' },
  { text: 'Small wins repeated daily become your identity.', category: 'general' },
];

export function getDefaultWisdomPool(): WisdomEntry[] {
  const pool: WisdomEntry[] = [];
  for (let i = 0; i < defaultBase.length; i++) {
    for (let j = 0; j < 120; j++) {
      pool.push({
        id: `default-${i}-${j}`,
        text: defaultBase[i].text,
        category: defaultBase[i].category,
      });
    }
  }
  return pool; // 1200 entries
}

export async function getCustomWisdomEntries(): Promise<WisdomEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(WISDOM_CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomWisdomEntries(entries: WisdomEntry[]): Promise<void> {
  await AsyncStorage.setItem(WISDOM_CUSTOM_KEY, JSON.stringify(entries));
}

export async function getAllWisdomEntries(): Promise<WisdomEntry[]> {
  const custom = await getCustomWisdomEntries();
  return [...getDefaultWisdomPool(), ...custom];
}

export function parseWisdomJson(input: string): WisdomEntry[] {
  const parsed = JSON.parse(input);
  const arr = Array.isArray(parsed) ? parsed : [];
  const now = Date.now();
  return arr
    .map((item: any, idx: number) => {
      if (typeof item === 'string') {
        return {
          id: `custom-${now}-${idx}`,
          text: item.trim(),
          category: 'general' as WisdomCategory,
        };
      }
      const text = String(item?.text ?? '').trim();
      const category = ['quit', 'running', 'diet', 'general'].includes(item?.category) ? item.category : 'general';
      if (!text) return null;
      return {
        id: `custom-${now}-${idx}`,
        text,
        category: category as WisdomCategory,
      };
    })
    .filter(Boolean) as WisdomEntry[];
}

export function parseWisdomCsv(input: string): WisdomEntry[] {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const now = Date.now();
  const entries: WisdomEntry[] = [];
  lines.forEach((line, idx) => {
    const parts = line.split(',');
    if (idx === 0 && /category/i.test(parts[0]) && /text/i.test(parts.slice(1).join(','))) return;
    if (parts.length < 2) return;
    const categoryRaw = parts[0].trim().toLowerCase();
    const category: WisdomCategory = (['quit', 'running', 'diet', 'general'].includes(categoryRaw) ? categoryRaw : 'general') as WisdomCategory;
    const text = parts.slice(1).join(',').trim();
    if (!text) return;
    entries.push({
      id: `custom-${now}-${idx}`,
      text,
      category,
    });
  });
  return entries;
}

