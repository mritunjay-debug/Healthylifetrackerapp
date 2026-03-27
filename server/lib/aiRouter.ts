export type AiTaskType =
  | "habit_suggestion"
  | "diet_suggestion"
  | "stats_explanation"
  | "quit_coaching"
  | "daily_action_plan"
  | "tracker_improvement"
  | "general";

export type RoutedProvider = "gemini" | "openai";

export type RouteInput = {
  taskType: AiTaskType;
  prompt: string;
  contextLength: number;
};

export type RouteDecision = {
  primary: RoutedProvider;
  fallback: RoutedProvider;
  complexity: "small" | "medium" | "large";
};

export type ProviderResponse = {
  provider: RoutedProvider;
  model: string;
  suggestions: string[];
  promptTokens: number | null;
  completionTokens: number | null;
  latencyMs: number;
  error?: string;
};

function estimateComplexity(prompt: string, contextLength: number): "small" | "medium" | "large" {
  const size = prompt.length + contextLength;
  if (size < 900) return "small";
  if (size < 2400) return "medium";
  return "large";
}

export function classifyRoute(input: RouteInput): RouteDecision {
  const complexity = estimateComplexity(input.prompt, input.contextLength);
  const complexTask = input.taskType === "quit_coaching" && complexity === "large";
  const useOpenAiFirst = complexTask || complexity === "large";
  return {
    primary: useOpenAiFirst ? "openai" : "gemini",
    fallback: useOpenAiFirst ? "gemini" : "openai",
    complexity,
  };
}

function splitSuggestions(text: string): string[] {
  return text
    .split("\n")
    .map((x) => x.replace(/^[\-\*\d\.\)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 10);
}

async function callGemini(prompt: string, timeoutMs: number): Promise<ProviderResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
  if (!apiKey) {
    return {
      provider: "gemini",
      model,
      suggestions: [],
      promptTokens: null,
      completionTokens: null,
      latencyMs: 0,
      error: "GEMINI_API_KEY missing",
    };
  }
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 500 },
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return {
        provider: "gemini",
        model,
        suggestions: [],
        promptTokens: null,
        completionTokens: null,
        latencyMs: Date.now() - start,
        error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
      };
    }
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    return {
      provider: "gemini",
      model,
      suggestions: splitSuggestions(text),
      promptTokens: json.usageMetadata?.promptTokenCount ?? null,
      completionTokens: json.usageMetadata?.candidatesTokenCount ?? null,
      latencyMs: Date.now() - start,
      error: text ? undefined : "Empty response",
    };
  } catch (e) {
    return {
      provider: "gemini",
      model,
      suggestions: [],
      promptTokens: null,
      completionTokens: null,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "Gemini request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenAi(prompt: string, timeoutMs: number): Promise<ProviderResponse> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  if (!apiKey) {
    return {
      provider: "openai",
      model,
      suggestions: [],
      promptTokens: null,
      completionTokens: null,
      latencyMs: 0,
      error: "OPENAI_API_KEY missing",
    };
  }
  const start = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are a concise health coach. Return practical bullet points." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return {
        provider: "openai",
        model,
        suggestions: [],
        promptTokens: null,
        completionTokens: null,
        latencyMs: Date.now() - start,
        error: `HTTP ${res.status}: ${errText.slice(0, 200)}`,
      };
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = json.choices?.[0]?.message?.content?.trim() || "";
    return {
      provider: "openai",
      model,
      suggestions: splitSuggestions(text),
      promptTokens: json.usage?.prompt_tokens ?? null,
      completionTokens: json.usage?.completion_tokens ?? null,
      latencyMs: Date.now() - start,
      error: text ? undefined : "Empty response",
    };
  } catch (e) {
    return {
      provider: "openai",
      model,
      suggestions: [],
      promptTokens: null,
      completionTokens: null,
      latencyMs: Date.now() - start,
      error: e instanceof Error ? e.message : "OpenAI request failed",
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function generateRoutedAi(input: RouteInput): Promise<ProviderResponse> {
  const route = classifyRoute(input);
  const primaryResp =
    route.primary === "gemini"
      ? await callGemini(input.prompt, 4500)
      : await callOpenAi(input.prompt, 7000);
  if (primaryResp.suggestions.length > 0 && !primaryResp.error) return primaryResp;

  const fallbackResp =
    route.fallback === "gemini"
      ? await callGemini(input.prompt, 4500)
      : await callOpenAi(input.prompt, 7000);
  if (fallbackResp.suggestions.length > 0 && !fallbackResp.error) return fallbackResp;

  return primaryResp.suggestions.length > 0 ? primaryResp : fallbackResp;
}

