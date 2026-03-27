import type { VercelRequest, VercelResponse } from "@vercel/node";
import { existsSync } from "fs";
import { resolve } from "path";
import { config as loadEnv } from "dotenv";
import {
  badRequest,
  handleOptions,
  jsonOk,
  methodNotAllowed,
  parseJsonBody,
  serverError,
  setCors,
} from "../../lib/http";
import { requireUser } from "../../lib/auth";
import { getServerEnv } from "../../lib/env";
import { createServiceRoleClient } from "../../lib/supabase";
import { countUserUsageThisMonth, insertUsage, monthStartIso } from "../../lib/aiUsage";
import { consumeUserCredits, estimateCredits } from "../../lib/aiCredits";
import { generateRoutedAi, type AiTaskType } from "../../lib/aiRouter";

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

type CoachBody = {
  profile?: DietProfilePayload;
  logs?: DietLogPayload[];
  budget?: number;
  todayIntake?: number;
  focus?: string;
  context?: string;
  payloadSummary?: string;
};

function loadLocalEnvFiles(): void {
  const roots = new Set<string>([process.cwd(), resolve(process.cwd(), "server")]);
  for (const root of roots) {
    const envPath = resolve(root, ".env");
    const localPath = resolve(root, ".env.local");
    if (existsSync(envPath)) loadEnv({ path: envPath });
    if (existsSync(localPath)) loadEnv({ path: localPath, override: true });
  }
}

function buildPrompt(body: CoachBody): string {
  const name = body.profile?.name?.trim() || "User";
  const goal = body.profile?.goal || "maintain";
  const pref = body.profile?.preference || "veg";
  const menu = body.profile?.menuStyle || "indian";
  const budget = Number.isFinite(body.budget) ? body.budget : 0;
  const intake = Number.isFinite(body.todayIntake) ? body.todayIntake : 0;
  const logs = (body.logs || []).slice(-7);
  const focus = body.focus?.trim() || "general coaching";
  const context = body.context?.trim() || "general";
  const payloadSummary = body.payloadSummary?.trim() || "";

  return [
    `You are a friendly fitness and diet coach for ${name}.`,
    "Give concise advice in plain English with short bullet points.",
    "Avoid medical diagnosis and dangerous suggestions.",
    `Goal: ${goal}, preference: ${pref}, menu style: ${menu}.`,
    `Today's budget: ${budget}, today's intake: ${intake}.`,
    `Current user focus request: ${focus}.`,
    `App context: ${context}.`,
    payloadSummary ? `Context data summary: ${payloadSummary}` : "",
    `Recent logs JSON: ${JSON.stringify(logs)}`,
    "Output format:",
    "- 1 line summary",
    "- 4 actionable meal/swap suggestions with foods",
    "- 1 hydration/consistency tip",
  ].join("\n");
}

function localCoachFallback(body: CoachBody): string[] {
  const context = body.context?.trim() || "general";
  const focus = body.focus?.trim() || "general coaching";
  const budget = Number.isFinite(body.budget) ? Number(body.budget) : 0;
  const intake = Number.isFinite(body.todayIntake) ? Number(body.todayIntake) : 0;
  const remaining = budget - intake;
  const pref = body.profile?.preference || "veg";
  const menu = body.profile?.menuStyle || "indian";
  const goal = body.profile?.goal || "maintain";
  const logs = (body.logs || []).slice(-7);

  const avgWater =
    logs.length > 0
      ? Math.round(logs.reduce((s, x) => s + (x.waterGlasses || 0), 0) / logs.length)
      : 0;
  const hasLateOvereating = logs.some(
    (x) =>
      Number.isFinite(x.calories) &&
      Number.isFinite(x.targetCalories) &&
      (x.calories || 0) > (x.targetCalories || 0) + 250
  );

  const mealBase =
    menu === "indian"
      ? pref === "nonveg"
        ? ["grilled chicken + salad", "egg bhurji + 2 roti", "dal + rice + sabzi"]
        : ["paneer/tofu bhurji + 2 roti", "dal + rice + sabzi", "sprouts chaat + curd"]
      : pref === "nonveg"
      ? ["chicken bowl + veggies", "omelette wrap + salad", "greek yogurt + nuts"]
      : ["tofu bowl + veggies", "oats + seeds + fruit", "hummus + carrots + nuts"];

  const line1 =
    remaining >= 0
      ? `You are on track today with about ${remaining} calories left.`
      : `You are about ${Math.abs(remaining)} calories above target today, so we should keep the next meal lighter.`;
  const line2 = `Focus for your ${goal} goal: prioritize protein first, then fiber-rich carbs.`;
  const line3 = `Meal swap 1: ${mealBase[0]}.`;
  const line4 = `Meal swap 2: ${mealBase[1]}.`;
  const line5 = `Meal swap 3: ${mealBase[2]}.`;
  const line6 =
    avgWater < 7
      ? "Hydration tip: add 2 more glasses of water by evening."
      : "Hydration tip: maintain your current water routine.";
  const line7 = hasLateOvereating
    ? "Consistency tip: pre-log dinner in the afternoon to reduce night overeating."
    : "Consistency tip: keep logging daily to maintain streak momentum.";
  const genericByContext: Record<string, string[]> = {
    home: [
      `Focus now: ${focus}`,
      "Pick your top 1 task and complete it in the next 15 minutes.",
      "Use a 2-minute starter to beat procrastination.",
    ],
    habits: [
      `Focus now: ${focus}`,
      "Complete one easiest habit first to create momentum.",
      "If you miss, do a tiny fallback instead of skipping.",
    ],
    stats: [
      `Focus now: ${focus}`,
      "Use one metric to improve this week instead of many.",
      "Track daily, review weekly, adjust gradually.",
    ],
    quit: [
      `Focus now: ${focus}`,
      "When urge hits: pause, breathe, water, move for 2 minutes.",
      "Avoid trigger chains by changing context immediately.",
    ],
    settings: [
      `Focus now: ${focus}`,
      "Turn on reminders for your highest-risk routine.",
      "Keep notifications concise and action-oriented.",
    ],
  };
  if (budget <= 0 && genericByContext[context]) return genericByContext[context];
  return [line1, line2, line3, line4, line5, line6, line7];
}

async function tryPublicApisAi(prompt: string): Promise<string[] | null> {
  const apiUrl = process.env.PUBLIC_APIS_AI_URL?.trim();
  const apiKey = process.env.PUBLIC_APIS_AI_KEY?.trim();
  if (!apiUrl || !apiKey) return null;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ message: prompt, prompt, query: prompt }),
  });

  if (!res.ok) return null;
  const text = await res.text();
  if (!text.trim()) return null;

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const raw =
      (typeof parsed.response === "string" && parsed.response) ||
      (typeof parsed.reply === "string" && parsed.reply) ||
      (typeof parsed.message === "string" && parsed.message) ||
      "";
    if (!raw) return null;
    return raw
      .split("\n")
      .map((x) => x.replace(/^[\-\*\d\.\)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 7);
  } catch {
    return text
      .split("\n")
      .map((x) => x.replace(/^[\-\*\d\.\)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 7);
  }
}

function inferTaskType(context?: string): AiTaskType {
  const c = (context || "general").toLowerCase();
  if (c === "habits") return "habit_suggestion";
  if (c === "diet") return "diet_suggestion";
  if (c === "stats") return "stats_explanation";
  if (c === "quit") return "quit_coaching";
  if (c === "home") return "daily_action_plan";
  if (c === "tracker") return "tracker_improvement";
  return "general";
}

loadLocalEnvFiles();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  if (handleOptions(req, res)) return;
  if (req.method !== "POST") {
    methodNotAllowed(res, ["POST", "OPTIONS"]);
    return;
  }

  let body: CoachBody;
  try {
    body = parseJsonBody(req) as CoachBody;
  } catch {
    badRequest(res, "Invalid JSON body");
    return;
  }

  if (!body || typeof body !== "object") {
    badRequest(res, "Body is required");
    return;
  }

  try {
    const authed = await requireUser(req, res);
    if (!authed) return;
    const env = getServerEnv();
    const admin = createServiceRoleClient(env);
    const monthlyCap = Math.max(
      1,
      Number.parseInt(process.env.FREE_AI_MESSAGES_PER_MONTH || "60", 10) || 60
    );
    const monthStart = monthStartIso();
    const used = await countUserUsageThisMonth(admin, authed.userId, monthStart);
    if (used >= monthlyCap) {
      await insertUsage(admin, {
        user_id: authed.userId,
        context: body.context?.trim() || "general",
        focus: body.focus?.trim() || null,
        source: "local-fallback",
        status: "blocked",
      });
      setCors(res);
      res.status(402).json({
        error: "You reached this month's AI message limit for the free app.",
        code: "AI_LIMIT_REACHED",
        used,
        cap: monthlyCap,
      });
      return;
    }

    const prompt = buildPrompt(body);
    const taskType = inferTaskType(body.context);
    const routed = await generateRoutedAi({
      taskType,
      prompt,
      contextLength: (body.payloadSummary || "").length,
    });
    const external = routed.suggestions.length ? routed.suggestions : await tryPublicApisAi(prompt);
    const suggestions = external ?? localCoachFallback(body);
    const source: "external" | "local-fallback" = external ? "external" : "local-fallback";

    const estimated = await estimateCredits(admin, {
      feature: body.context?.trim() || "general",
      promptTokens: routed.promptTokens,
      completionTokens: routed.completionTokens,
      complexity: prompt.length < 900 ? "small" : prompt.length < 2400 ? "medium" : "large",
    });
    const consumed = await consumeUserCredits(
      admin,
      authed.userId,
      body.context?.trim() || "general",
      estimated.credits
    );
    if (!consumed.allowed) {
      await insertUsage(admin, {
        user_id: authed.userId,
        context: body.context?.trim() || "general",
        focus: body.focus?.trim() || null,
        source: "local-fallback",
        status: "blocked",
      });
      setCors(res);
      res.status(402).json({
        status: "limit_reached",
        error: "AI limit reached",
        code: "AI_LIMIT_REACHED",
        credits_remaining: 0,
        used: consumed.used,
        cap: consumed.limit,
        reset_date: consumed.resetDate,
      });
      return;
    }

    await insertUsage(admin, {
      user_id: authed.userId,
      context: body.context?.trim() || "general",
      focus: body.focus?.trim() || null,
      source,
      status: "ok",
    });
    jsonOk(res, {
      source,
      suggestions,
      usage: {
        used: used + 1,
        cap: monthlyCap,
        credits_used: consumed.used,
        credits_cap: consumed.limit,
        credits_remaining: consumed.remainingCredits,
        warning_level: consumed.warningLevel,
        reset_date: consumed.resetDate,
      },
      provider: { selected: routed.provider, model: routed.model, latency_ms: routed.latencyMs, error: routed.error },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI coach generation failed";
    serverError(res, msg);
  }
}

