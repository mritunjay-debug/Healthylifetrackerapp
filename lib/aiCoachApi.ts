import { getApiBaseUrlCandidates } from "./config";
import { loadStoredAuth } from "./authSession";

type DietProfilePayload = {
  name?: string;
  age?: string;
  height?: string;
  weight?: string;
  activity?: string;
  goal?: string;
  preference?: string;
  menuStyle?: string;
};

type DietLogPayload = {
  date?: string;
  calories?: number;
  targetCalories?: number;
  waterGlasses?: number;
  weight?: number;
};

export type DietCoachResponse = {
  source: "external" | "local-fallback";
  suggestions: string[];
};

export async function getDietCoachSuggestions(input: {
  profile: DietProfilePayload;
  logs: DietLogPayload[];
  budget: number;
  todayIntake: number;
  focus?: string;
  context?: string;
  payloadSummary?: string;
}): Promise<DietCoachResponse> {
  const candidates = getApiBaseUrlCandidates();
  let lastError: Error | null = null;
  const stored = await loadStoredAuth();
  const accessToken = stored?.session?.access_token;
  if (!accessToken) {
    throw new Error("Please sign in to use AI features.");
  }

  for (const base of candidates) {
    try {
      const res = await fetch(`${base}/api/ai/diet-coach`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(input),
      });
      const text = await res.text();
      const data = text
        ? (JSON.parse(text) as Partial<DietCoachResponse> & { error?: string; code?: string; used?: number; cap?: number })
        : {};
      if (!res.ok) throw new Error(data.error || `AI request failed (${res.status})`);
      return {
        source: data.source === "external" ? "external" : "local-fallback",
        suggestions: Array.isArray(data.suggestions) ? data.suggestions.filter((x): x is string => typeof x === "string") : [],
      };
    } catch (e) {
      lastError = e instanceof Error ? e : new Error("AI coach request failed");
    }
  }

  throw lastError ?? new Error("AI coach unavailable");
}

