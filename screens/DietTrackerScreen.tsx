import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { getDietCoachSuggestions } from '../lib/aiCoachApi';
import { getDietLogs, saveDietLogs } from '../lib/storage';
import { DietLog } from '../lib/types';

type Sex = 'male' | 'female';
type Activity = 'easy' | 'balanced' | 'high';
type Goal = 'maintain' | 'lose' | 'gain';
type DietPreference = 'veg' | 'egg' | 'nonveg' | 'vegan';
type MenuStyle = 'indian' | 'global';

type DietProfile = {
  name: string;
  sex: Sex;
  age: string;
  height: string;
  weight: string;
  activity: Activity;
  goal: Goal;
  preference: DietPreference;
  menuStyle: MenuStyle;
};

const PROFILE_KEY = '@diet_profile_v2';

const defaultProfile: DietProfile = {
  name: '',
  sex: 'male',
  age: '25',
  height: '170',
  weight: '70',
  activity: 'balanced',
  goal: 'maintain',
  preference: 'veg',
  menuStyle: 'indian',
};

const activityMultiplier: Record<Activity, number> = {
  easy: 1.35,
  balanced: 1.55,
  high: 1.78,
};

const mealIdeas: Record<
  MenuStyle,
  Record<DietPreference, { breakfast: string; lunch: string; snack: string; dinner: string }>
> = {
  indian: {
    veg: {
      breakfast: 'Poha/upma + curd + fruit',
      lunch: 'Dal + rice + sabzi + salad',
      snack: 'Roasted chana + chaas',
      dinner: 'Paneer/tofu + 2 roti + sabzi',
    },
    egg: {
      breakfast: '2-3 boiled eggs + veg poha',
      lunch: 'Egg curry + rice + salad',
      snack: 'Dahi + nuts',
      dinner: 'Egg bhurji + 2 roti + sabzi',
    },
    nonveg: {
      breakfast: 'Masala omelette + toast + fruit',
      lunch: 'Grilled chicken + rice + sabzi',
      snack: 'Greek yogurt + peanuts',
      dinner: 'Fish/chicken curry + 2 roti + salad',
    },
    vegan: {
      breakfast: 'Moong chilla + coconut chutney',
      lunch: 'Rajma/chole + brown rice + salad',
      snack: 'Peanut chaat + lemon water',
      dinner: 'Tofu bhurji + millet roti + sabzi',
    },
  },
  global: {
    veg: {
      breakfast: 'Oats bowl + fruit + seeds',
      lunch: 'Lentil bowl + quinoa + greens',
      snack: 'Roasted nuts + yogurt',
      dinner: 'Paneer bowl + whole-grain wrap',
    },
    egg: {
      breakfast: 'Egg scramble + toast + fruit',
      lunch: 'Egg rice bowl + vegetables',
      snack: 'Greek yogurt + nuts',
      dinner: 'Egg wrap + sauteed veggies',
    },
    nonveg: {
      breakfast: 'Omelette + toast + fruit',
      lunch: 'Chicken bowl + rice + vegetables',
      snack: 'Yogurt + nuts',
      dinner: 'Fish/chicken + salad + wrap',
    },
    vegan: {
      breakfast: 'Tofu scramble + toast + fruit',
      lunch: 'Chickpea bowl + millet',
      snack: 'Hummus + carrots + nuts',
      dinner: 'Tofu stir fry + quinoa',
    },
  },
};

export default function DietTrackerScreen() {
  const navigation = useNavigation<any>();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const { width } = useWindowDimensions();

  const [profile, setProfile] = useState<DietProfile>(defaultProfile);
  const [logs, setLogs] = useState<DietLog[]>([]);
  const [intake, setIntake] = useState('');
  const [water, setWater] = useState('0');
  const [todayWeight, setTodayWeight] = useState('');
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachLines, setCoachLines] = useState<string[]>([]);
  const [coachSource, setCoachSource] = useState<'external' | 'local-fallback' | null>(null);
  const [coachFocus, setCoachFocus] = useState('What should I eat today?');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const [stored, dietLogs] = await Promise.all([
      AsyncStorage.getItem(PROFILE_KEY),
      getDietLogs(),
    ]);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as DietProfile;
        setProfile({ ...defaultProfile, ...parsed });
      } catch {
        // ignore invalid saved profile
      }
    }
    setLogs(dietLogs.sort((a, b) => a.date.localeCompare(b.date)));
    const today = new Date().toISOString().split('T')[0];
    const todayLog = dietLogs.find((l) => l.date === today);
    if (todayLog?.calories != null) setIntake(String(todayLog.calories));
    if (todayLog?.waterGlasses != null) setWater(String(todayLog.waterGlasses));
    if (todayLog?.weight != null) setTodayWeight(String(todayLog.weight));
  };

  const updateProfile = async (next: Partial<DietProfile>) => {
    const merged = { ...profile, ...next };
    setProfile(merged);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
  };

  const calc = useMemo(() => {
    const age = parseInt(profile.age, 10) || 0;
    const height = parseFloat(profile.height) || 0;
    const weight = parseFloat(profile.weight) || 0;
    if (age <= 0 || height <= 0 || weight <= 0) {
      return { bmr: 0, baseline: 0, budget: 0, protein: 0, carbs: 0, fat: 0 };
    }

    const bmr =
      profile.sex === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
    const baseline = bmr * activityMultiplier[profile.activity];
    const budget =
      profile.goal === 'lose'
        ? baseline - 420
        : profile.goal === 'gain'
        ? baseline + 280
        : baseline;
    const finalBudget = Math.max(1200, Math.round(budget));

    const proteinBase = profile.goal === 'gain' ? 1.9 : profile.goal === 'lose' ? 1.8 : 1.6;
    const protein = Math.round(weight * proteinBase);
    const fat = Math.round(weight * 0.8);
    const carbs = Math.max(40, Math.round((finalBudget - protein * 4 - fat * 9) / 4));

    return {
      bmr: Math.round(bmr),
      baseline: Math.round(baseline),
      budget: finalBudget,
      protein,
      carbs,
      fat,
    };
  }, [profile]);

  const todayRemaining = useMemo(() => calc.budget - (parseInt(intake, 10) || 0), [calc.budget, intake]);

  const dietTable = useMemo(() => {
    const split = [
      { meal: 'Breakfast', ratio: 0.27 },
      { meal: 'Lunch', ratio: 0.34 },
      { meal: 'Snack', ratio: 0.12 },
      { meal: 'Dinner', ratio: 0.27 },
    ] as const;
    const ideas = mealIdeas[profile.menuStyle][profile.preference];
    return split.map((s) => ({
      meal: s.meal,
      target: Math.round(calc.budget * s.ratio),
      protein: Math.round(calc.protein * s.ratio),
      idea:
        s.meal === 'Breakfast'
          ? ideas.breakfast
          : s.meal === 'Lunch'
          ? ideas.lunch
          : s.meal === 'Snack'
          ? ideas.snack
          : ideas.dinner,
    }));
  }, [calc.budget, calc.protein, profile.preference, profile.menuStyle]);

  const weekly = useMemo(() => {
    const byDate = new Map(logs.map((l) => [l.date, l]));
    const labels: string[] = [];
    const intakeData: number[] = [];
    const budgetData: number[] = [];
    const weightData: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];
      const row = byDate.get(date);
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      intakeData.push(row?.calories ?? 0);
      budgetData.push(row?.targetCalories ?? calc.budget);
      weightData.push(row?.weight ?? 0);
    }
    return { labels, intakeData, budgetData, weightData };
  }, [logs, calc.budget]);

  const quickStats = useMemo(() => {
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const loggedDays = sorted.length;
    const last7 = sorted.slice(-7);
    const adherence =
      last7.length === 0
        ? 0
        : Math.round(
            (last7.reduce((acc, d) => {
              if (!d.targetCalories || !d.calories) return acc;
              const deviation = Math.abs(d.calories - d.targetCalories) / Math.max(1, d.targetCalories);
              return acc + Math.max(0, 1 - deviation);
            }, 0) /
              last7.length) *
              100
          );
    const avgIntake =
      last7.length === 0
        ? 0
        : Math.round(last7.reduce((sum, d) => sum + (d.calories ?? 0), 0) / last7.length);

    let streak = 0;
    const dateSet = new Set(sorted.map((d) => d.date));
    const cursor = new Date();
    while (true) {
      const key = cursor.toISOString().split('T')[0];
      if (!dateSet.has(key)) break;
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { loggedDays, adherence, avgIntake, streak };
  }, [logs]);

  const calendarHeatmap = useMemo(() => {
    const map = new Map(logs.map((l) => [l.date, l]));
    const cells: Array<{ key: string; label: string; intensity: 0 | 1 | 2 | 3 }> = [];
    for (let i = 34; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const row = map.get(key);
      let intensity: 0 | 1 | 2 | 3 = 0;
      if (row?.calories && row?.targetCalories) {
        const deviation = Math.abs(row.calories - row.targetCalories) / Math.max(1, row.targetCalories);
        intensity = deviation <= 0.1 ? 3 : deviation <= 0.2 ? 2 : 1;
      } else if (row) {
        intensity = 1;
      }
      cells.push({
        key,
        label: d.toLocaleDateString('en-US', { day: '2-digit' }),
        intensity,
      });
    }
    return cells;
  }, [logs]);

  const weightSeries = useMemo(() => {
    let last = 0;
    return weekly.weightData.map((v) => {
      const next = Number.isFinite(v) && v > 0 ? v : last;
      if (next > 0) last = next;
      return next;
    });
  }, [weekly.weightData]);

  const weightInsight = useMemo(() => {
    const points = logs
      .filter((l) => typeof l.weight === 'number')
      .slice(-10)
      .map((l) => l.weight as number);
    if (points.length < 2) return 'Add weight for a few days to unlock trend insight.';
    const delta = points[points.length - 1] - points[0];
    if (Math.abs(delta) < 0.2) return 'Stable trend: your weight is holding steady.';
    return delta < 0
      ? `Down trend detected: ${Math.abs(delta).toFixed(1)} moved down in recent check-ins.`
      : `Up trend detected: ${delta.toFixed(1)} moved up in recent check-ins.`;
  }, [logs]);

  const personalHeadline = profile.name.trim()
    ? `${profile.name.trim()}, your plan is tuned for you`
    : 'Your plan is tuned for you';

  const saveToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    const next: DietLog = {
      id: `diet-${today}`,
      date: today,
      calories: parseInt(intake, 10) || 0,
      targetCalories: calc.budget,
      proteinG: calc.protein,
      carbsG: calc.carbs,
      fatG: calc.fat,
      waterGlasses: parseInt(water, 10) || 0,
      weight: parseFloat(todayWeight) || undefined,
      mood: 3,
      energy: 3,
      wins: [],
      challenges: [],
      mealEntries: [],
    };
    const remaining = logs.filter((l) => l.date !== today);
    const updated = [...remaining, next].sort((a, b) => a.date.localeCompare(b.date));
    await saveDietLogs(updated);
    setLogs(updated);
    Alert.alert('Saved', 'Your personalized diet day has been saved.');
  };

  const fetchAiCoach = async (focus?: string) => {
    try {
      setCoachLoading(true);
      const nextFocus = (focus ?? coachFocus).trim();
      if (focus) setCoachFocus(focus);
      const resp = await getDietCoachSuggestions({
        profile,
        logs: logs.slice(-14).map((l) => ({
          date: l.date,
          calories: l.calories,
          targetCalories: l.targetCalories,
          waterGlasses: l.waterGlasses,
          weight: l.weight,
        })),
        budget: calc.budget,
        todayIntake: parseInt(intake, 10) || 0,
        focus: nextFocus,
        context: 'diet',
        payloadSummary: `menuStyle=${profile.menuStyle}, preference=${profile.preference}, todayRemaining=${todayRemaining}`,
      });
      setCoachLines(resp.suggestions.slice(0, 7));
      setCoachSource(resp.source);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load coach suggestions';
      Alert.alert('Coach unavailable', msg);
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]}>Calorie & Diet Studio</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>{personalHeadline}</Text>
          <Text style={[styles.cardSub, { color: c.mutedText }]}>
            Personal profile drives your daily budget and meal table.
          </Text>
          <View style={styles.metricGrid}>
            <MetricTile label="Logged Days" value={String(quickStats.loggedDays)} color={c.primary} />
            <MetricTile label="Current Streak" value={String(quickStats.streak)} color={c.success} />
            <MetricTile label="Adherence %" value={String(quickStats.adherence)} color={c.accent} />
          </View>

          <TextInput
            value={profile.name}
            onChangeText={(v) => updateProfile({ name: v })}
            placeholder="Your name"
            placeholderTextColor={c.mutedText}
            style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
          />
          <View style={styles.row}>
            <TextInput
              value={profile.age}
              onChangeText={(v) => updateProfile({ age: v })}
              placeholder="Age"
              placeholderTextColor={c.mutedText}
              keyboardType="number-pad"
              style={[styles.input, styles.half, { color: c.text, backgroundColor: c.surfaceElevated }]}
            />
            <TextInput
              value={profile.height}
              onChangeText={(v) => updateProfile({ height: v })}
              placeholder="Height"
              placeholderTextColor={c.mutedText}
              keyboardType="decimal-pad"
              style={[styles.input, styles.half, { color: c.text, backgroundColor: c.surfaceElevated }]}
            />
          </View>
          <TextInput
            value={profile.weight}
            onChangeText={(v) => updateProfile({ weight: v })}
            placeholder="Current weight"
            placeholderTextColor={c.mutedText}
            keyboardType="decimal-pad"
            style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
          />

          <Text style={[styles.sectionLabel, { color: c.text }]}>Activity</Text>
          <View style={styles.row}>
            <Pill label="Easy" active={profile.activity === 'easy'} onPress={() => updateProfile({ activity: 'easy' })} />
            <Pill label="Balanced" active={profile.activity === 'balanced'} onPress={() => updateProfile({ activity: 'balanced' })} />
            <Pill label="High" active={profile.activity === 'high'} onPress={() => updateProfile({ activity: 'high' })} />
          </View>

          <Text style={[styles.sectionLabel, { color: c.text }]}>Goal</Text>
          <View style={styles.row}>
            <Pill label="Maintain" active={profile.goal === 'maintain'} onPress={() => updateProfile({ goal: 'maintain' })} />
            <Pill label="Fat Loss" active={profile.goal === 'lose'} onPress={() => updateProfile({ goal: 'lose' })} />
            <Pill label="Lean Gain" active={profile.goal === 'gain'} onPress={() => updateProfile({ goal: 'gain' })} />
          </View>

          <Text style={[styles.sectionLabel, { color: c.text }]}>Food Preference</Text>
          <View style={styles.row}>
            <Pill label="Veg" active={profile.preference === 'veg'} onPress={() => updateProfile({ preference: 'veg' })} />
            <Pill label="Egg" active={profile.preference === 'egg'} onPress={() => updateProfile({ preference: 'egg' })} />
            <Pill label="Non-veg" active={profile.preference === 'nonveg'} onPress={() => updateProfile({ preference: 'nonveg' })} />
            <Pill label="Vegan" active={profile.preference === 'vegan'} onPress={() => updateProfile({ preference: 'vegan' })} />
          </View>

          <Text style={[styles.sectionLabel, { color: c.text }]}>Menu Style</Text>
          <View style={styles.row}>
            <Pill
              label="Indian Menu"
              active={profile.menuStyle === 'indian'}
              onPress={() => updateProfile({ menuStyle: 'indian' })}
            />
            <Pill
              label="Global Menu"
              active={profile.menuStyle === 'global'}
              onPress={() => updateProfile({ menuStyle: 'global' })}
            />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Smart Calculation</Text>
          <View style={styles.metricGrid}>
            <MetricTile label="BMR" value={String(calc.bmr)} color={c.text} />
            <MetricTile label="Baseline" value={String(calc.baseline)} color={c.info} />
            <MetricTile label="Daily Budget" value={String(calc.budget)} color={c.primary} />
          </View>
          <View style={styles.metricGrid}>
            <MetricTile label="Protein" value={String(calc.protein)} color={c.success} />
            <MetricTile label="Carbs" value={String(calc.carbs)} color={c.accent} />
            <MetricTile label="Fat" value={String(calc.fat)} color={'#f59e0b'} />
          </View>
          <Text style={[styles.cardSub, { color: c.mutedText, marginBottom: 0 }]}>
            Results intentionally shown without unit suffix for a cleaner reading experience.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Personalized Diet Table</Text>
          <Text style={[styles.cardSub, { color: c.mutedText }]}>
            Customized by your goal + preference + daily budget.
          </Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHead, { color: c.text, flex: 1 }]}>Meal</Text>
            <Text style={[styles.tableHead, { color: c.text, width: 70, textAlign: 'right' }]}>Target</Text>
            <Text style={[styles.tableHead, { color: c.text, width: 70, textAlign: 'right' }]}>Protein</Text>
          </View>
          {dietTable.map((row) => (
            <View key={row.meal} style={[styles.tableRow, { borderColor: c.border }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.tableMeal, { color: c.text }]}>{row.meal}</Text>
                <Text style={[styles.tableIdea, { color: c.mutedText }]}>{row.idea}</Text>
              </View>
              <Text style={[styles.tableValue, { color: c.primary, width: 70, textAlign: 'right' }]}>{row.target}</Text>
              <Text style={[styles.tableValue, { color: c.success, width: 70, textAlign: 'right' }]}>{row.protein}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Today Check-in</Text>
          <TextInput
            value={intake}
            onChangeText={setIntake}
            keyboardType="number-pad"
            placeholder="Total intake today"
            placeholderTextColor={c.mutedText}
            style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
          />
          <View style={styles.row}>
            <TextInput
              value={water}
              onChangeText={setWater}
              keyboardType="number-pad"
              placeholder="Water glasses"
              placeholderTextColor={c.mutedText}
              style={[styles.input, styles.half, { color: c.text, backgroundColor: c.surfaceElevated }]}
            />
            <TextInput
              value={todayWeight}
              onChangeText={setTodayWeight}
              keyboardType="decimal-pad"
              placeholder="Weight check-in"
              placeholderTextColor={c.mutedText}
              style={[styles.input, styles.half, { color: c.text, backgroundColor: c.surfaceElevated }]}
            />
          </View>
          <Text style={[styles.balance, { color: todayRemaining >= 0 ? c.success : c.danger }]}>
            {todayRemaining >= 0 ? `${todayRemaining} left for today` : `${Math.abs(todayRemaining)} above today`}
          </Text>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: c.primary }]} onPress={saveToday} activeOpacity={0.85}>
            <Text style={styles.saveText}>Save Personalized Day</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Diet AI Coach</Text>
          <Text style={[styles.cardSub, { color: c.mutedText }]}>
            Personalized recommendations from your profile and recent logs.
          </Text>
          <TextInput
            value={coachFocus}
            onChangeText={setCoachFocus}
            placeholder="Ask AI: what should I eat now?"
            placeholderTextColor={c.mutedText}
            style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
          />
          <View style={styles.row}>
            <Pill label="What to eat now" active={false} onPress={() => fetchAiCoach('What should I eat now to stay on target?')} />
            <Pill label="Full day plan" active={false} onPress={() => fetchAiCoach('Give me a breakfast/lunch/snack/dinner plan for today.')} />
            <Pill label="High protein" active={false} onPress={() => fetchAiCoach('Suggest high-protein meals for my day.')} />
            <Pill label="Budget fix" active={false} onPress={() => fetchAiCoach('I am above calories. What should I eat for next meal?')} />
          </View>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: c.accent }]}
            onPress={() => fetchAiCoach()}
            activeOpacity={0.85}
            disabled={coachLoading}
          >
            <Text style={styles.saveText}>{coachLoading ? 'Generating...' : 'Get AI Suggestions'}</Text>
          </TouchableOpacity>
          {coachSource ? (
            <Text style={[styles.cardSub, { color: c.mutedText, marginTop: 8, marginBottom: 2 }]}>
              Source: {coachSource === 'external' ? 'Public API model' : 'Smart local coach'}
            </Text>
          ) : null}
          {coachLines.map((line, idx) => (
            <Text key={`${idx}-${line}`} style={[styles.coachLine, { color: c.text }]}>
              • {line}
            </Text>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Progress Visualization</Text>
          <Text style={[styles.cardSub, { color: c.mutedText }]}>
            7-day avg intake: {quickStats.avgIntake} • consistency score: {quickStats.adherence}%
          </Text>
          <Text style={[styles.cardSub, { color: c.mutedText }]}>Intake vs budget</Text>
          <LineChart
            data={{
              labels: weekly.labels,
              datasets: [
                { data: weekly.intakeData, color: () => c.primary },
                { data: weekly.budgetData, color: () => c.accent },
              ],
              legend: ['Intake', 'Budget'],
            }}
            width={Math.max(280, width - 70)}
            height={210}
            chartConfig={{
              backgroundColor: c.surface,
              backgroundGradientFrom: c.surface,
              backgroundGradientTo: c.surface,
              decimalPlaces: 0,
              color: () => c.primary,
              labelColor: () => c.text,
            }}
            bezier
            style={{ borderRadius: 12, marginTop: 6 }}
          />

          <Text style={[styles.cardSub, { color: c.mutedText, marginTop: 16 }]}>Weight movement (fall/gain)</Text>
          <LineChart
            data={{
              labels: weekly.labels,
              datasets: [{ data: weightSeries, color: () => c.success }],
              legend: ['Weight'],
            }}
            width={Math.max(280, width - 70)}
            height={190}
            chartConfig={{
              backgroundColor: c.surface,
              backgroundGradientFrom: c.surface,
              backgroundGradientTo: c.surface,
              decimalPlaces: 1,
              color: () => c.success,
              labelColor: () => c.text,
            }}
            bezier
            style={{ borderRadius: 12, marginTop: 6 }}
          />
          <Text style={[styles.insight, { color: c.text }]}>{weightInsight}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Recent Logged Days</Text>
          <Text style={[styles.cardSub, { color: c.mutedText }]}>
            Quick history of your recent check-ins.
          </Text>
          {logs
            .slice(-10)
            .reverse()
            .map((d) => (
              <View key={d.date} style={[styles.logRow, { borderColor: c.border }]}>
                <Text style={[styles.logDate, { color: c.text }]}>{d.date}</Text>
                <Text style={[styles.logMeta, { color: c.mutedText }]}>
                  Intake {d.calories ?? 0} · Target {d.targetCalories ?? calc.budget} · Weight {d.weight ?? '-'}
                </Text>
              </View>
            ))}
          {logs.length === 0 ? (
            <Text style={[styles.cardSub, { color: c.mutedText }]}>No logs yet. Save your first personalized day.</Text>
          ) : null}
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Monthly Consistency Heatmap</Text>
          <Text style={[styles.cardSub, { color: c.mutedText }]}>
            Last 35 days. Darker blocks mean better target alignment.
          </Text>
          <View style={styles.heatmapGrid}>
            {calendarHeatmap.map((cell) => {
              const bg =
                cell.intensity === 3
                  ? c.success
                  : cell.intensity === 2
                  ? c.primary
                  : cell.intensity === 1
                  ? c.accent
                  : c.border;
              return (
                <View key={cell.key} style={[styles.heatCell, { backgroundColor: bg }]}>
                  <Text style={[styles.heatText, { color: cell.intensity === 0 ? c.mutedText : '#fff' }]}>
                    {cell.label}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.heatLegend}>
            <LegendDot color={c.border} label="No log" />
            <LegendDot color={c.accent} label="Logged" />
            <LegendDot color={c.primary} label="Close" />
            <LegendDot color={c.success} label="On target" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.pill,
        { backgroundColor: active ? '#0EA5E9' : '#0f172a12' },
      ]}
      activeOpacity={0.85}
    >
      <Text style={{ color: active ? '#fff' : '#111827', fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function MetricTile({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '800' },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800' },
  cardSub: { fontSize: 12, marginTop: 2, marginBottom: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  half: { width: '48%' },
  input: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 10, fontSize: 14 },
  sectionLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  pill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  metricGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  metricTile: { borderRadius: 12, backgroundColor: '#ffffff10', paddingVertical: 10, paddingHorizontal: 10, flex: 1, marginRight: 8 },
  metricValue: { fontSize: 18, fontWeight: '900' },
  metricLabel: { color: '#6b7280', fontSize: 11, fontWeight: '700', marginTop: 2 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 8, marginBottom: 4 },
  tableHead: { fontSize: 12, fontWeight: '800' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 9 },
  tableMeal: { fontSize: 13, fontWeight: '800' },
  tableIdea: { fontSize: 12, marginTop: 2, lineHeight: 18 },
  tableValue: { fontSize: 13, fontWeight: '900' },
  logRow: { borderBottomWidth: 1, paddingVertical: 8 },
  logDate: { fontSize: 13, fontWeight: '800' },
  logMeta: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  heatmapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  heatCell: {
    width: '13.2%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  heatText: { fontSize: 10, fontWeight: '800' },
  heatLegend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12, marginBottom: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 5 },
  legendLabel: { fontSize: 11, color: '#6b7280', fontWeight: '700' },
  balance: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  saveButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  insight: { fontSize: 13, fontWeight: '700', marginTop: 10, lineHeight: 20 },
  coachLine: { fontSize: 13, fontWeight: '600', marginTop: 8, lineHeight: 20 },
});

