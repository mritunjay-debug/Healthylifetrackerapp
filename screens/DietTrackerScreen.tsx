import React, { useEffect, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { getDietLogs, saveDietLogs } from '../lib/storage';
import { DietLog } from '../lib/types';
import { getAppPreferences } from '../lib/appPreferences';
import { LineChart } from 'react-native-chart-kit';

type Sex = 'male' | 'female';
type Activity = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
type Goal = 'maintain' | 'lose' | 'gain';
type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
type Formula = 'mifflin' | 'harris' | 'katch';

const activityMultipliers: Record<Activity, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export default function DietTrackerScreen() {
  const navigation = useNavigation<any>();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const { width } = useWindowDimensions();

  const [sex, setSex] = useState<Sex>('male');
  const [formula, setFormula] = useState<Formula>('mifflin');
  const [activity, setActivity] = useState<Activity>('moderate');
  const [goal, setGoal] = useState<Goal>('maintain');
  const [age, setAge] = useState('25');
  const [heightCm, setHeightCm] = useState('170');
  const [weightKg, setWeightKg] = useState('70');
  const [consumedCalories, setConsumedCalories] = useState('');
  const [waterGlasses, setWaterGlasses] = useState('0');

  const [todayLog, setTodayLog] = useState<DietLog | null>(null);
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>('km');
  const [weeklyLogs, setWeeklyLogs] = useState<DietLog[]>([]);
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');
  const [foodFat, setFoodFat] = useState('');
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [bodyFatPct, setBodyFatPct] = useState('20');

  useEffect(() => {
    loadTodayLog();
    getAppPreferences().then((prefs) => {
      setCurrencySymbol(prefs.currencySymbol || '₹');
      setWeightUnit(prefs.weightUnit);
      setDistanceUnit(prefs.distanceUnit);
    });
  }, []);

  const loadTodayLog = async () => {
    const logs = await getDietLogs();
    const today = new Date().toISOString().split('T')[0];
    const found = logs.find((l) => l.date === today) ?? null;
    const last7 = [...logs]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
    setWeeklyLogs(last7);
    setTodayLog(found);
    if (found?.calories != null) setConsumedCalories(String(found.calories));
    if (found?.waterGlasses != null) setWaterGlasses(String(found.waterGlasses));
  };

  const targets = useMemo(() => {
    const ageN = parseInt(age) || 0;
    const h = parseFloat(heightCm) || 0;
    const rawW = parseFloat(weightKg) || 0;
    const w = weightUnit === 'lb' ? rawW * 0.453592 : rawW;
    if (ageN <= 0 || h <= 0 || w <= 0) {
      return { bmr: 0, tdee: 0, target: 0 };
    }

    const bf = Math.max(0, Math.min(60, parseFloat(bodyFatPct) || 0)) / 100;
    let bmr = sex === 'male' ? 10 * w + 6.25 * h - 5 * ageN + 5 : 10 * w + 6.25 * h - 5 * ageN - 161;
    if (formula === 'harris') {
      bmr =
        sex === 'male'
          ? 13.397 * w + 4.799 * h - 5.677 * ageN + 88.362
          : 9.247 * w + 3.098 * h - 4.33 * ageN + 447.593;
    } else if (formula === 'katch') {
      bmr = 370 + 21.6 * (1 - bf) * w;
    }

    const tdee = bmr * activityMultipliers[activity];
    const target = goal === 'lose' ? tdee - 400 : goal === 'gain' ? tdee + 300 : tdee;
    return { bmr, tdee, target: Math.max(1200, target) };
  }, [age, heightCm, weightKg, weightUnit, sex, activity, goal, formula, bodyFatPct]);

  const caloriePlans = useMemo(() => {
    const maintain = Math.round(targets.tdee);
    const mild = Math.max(1200, maintain - 250);
    const loss = Math.max(1200, maintain - 500);
    const extreme = Math.max(1200, maintain - 1000);
    return { maintain, mild, loss, extreme };
  }, [targets.tdee]);

  const weeklyLoss = useMemo(() => {
    const toKgPerWeek = (dailyDeficit: number) => (dailyDeficit * 7) / 7700;
    const toLbPerWeek = (dailyDeficit: number) => (dailyDeficit * 7) / 3500;
    const metric = weightUnit === 'kg' && distanceUnit === 'km';
    const unit = metric ? 'kg/week' : 'lb/week';
    const fmt = (v: number) => v.toFixed(1);
    return {
      unit,
      mild: fmt(metric ? toKgPerWeek(250) : toLbPerWeek(250)),
      loss: fmt(metric ? toKgPerWeek(500) : toLbPerWeek(500)),
      extreme: fmt(metric ? toKgPerWeek(1000) : toLbPerWeek(1000)),
    };
  }, [weightUnit, distanceUnit]);

  const zigzag = useMemo(() => {
    const { maintain, mild, loss, extreme } = caloriePlans;
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const s1 = days.map((d, idx) => ({
      day: d,
      mild: idx === 0 || idx === 6 ? maintain : Math.max(1200, mild - 100),
      loss: idx === 0 || idx === 6 ? maintain : Math.max(1200, loss - 100),
      extreme: idx === 0 || idx === 6 ? Math.max(1200, extreme + 150) : extreme,
    }));
    return s1;
  }, [caloriePlans]);

  const activityImpact = useMemo(() => {
    // Reference-style exercise impact table scaled by body weight.
    const rawW = parseFloat(weightKg) || 70;
    const weightLb = weightUnit === 'lb' ? rawW : rawW * 2.20462;
    const weightFactor = weightLb / 155;
    const baseDailyBurn = [200, 650, 1100];
    const metric = weightUnit === 'kg' && distanceUnit === 'km';
    const unit = metric ? 'kg/week' : 'lb/week';
    const convert = (daily: number) => {
      const scaled = daily * weightFactor;
      const lbPerWeek = (scaled * 7) / 3500;
      return metric ? lbPerWeek * 0.453592 : lbPerWeek;
    };
    return {
      unit,
      rows: [
        { label: 'Daily exercise, or intense exercise 3-4 times/week', value: convert(baseDailyBurn[0]).toFixed(1) },
        { label: 'Intense exercise 6-7 times/week', value: convert(baseDailyBurn[1]).toFixed(1) },
        { label: 'Very intense exercise daily, or highly physical job', value: convert(baseDailyBurn[2]).toFixed(1) },
      ],
    };
  }, [weightKg, weightUnit, distanceUnit]);

  const remaining = Math.round(targets.target - (parseInt(consumedCalories) || 0));
  const bmi = useMemo(() => {
    const hMeters = (parseFloat(heightCm) || 0) / 100;
    const rawW = parseFloat(weightKg) || 0;
    const kg = weightUnit === 'lb' ? rawW * 0.453592 : rawW;
    if (hMeters <= 0 || kg <= 0) return 0;
    return kg / (hMeters * hMeters);
  }, [heightCm, weightKg, weightUnit]);

  const bmiLabel =
    bmi === 0
      ? 'n/a'
      : bmi < 18.5
      ? 'Underweight'
      : bmi < 25
      ? 'Healthy'
      : bmi < 30
      ? 'Overweight'
      : 'Obesity';

  // Practical macro targets (internet-backed common ranges):
  // protein ~1.6 g/kg, fat ~0.8 g/kg, remaining from carbs.
  const macros = useMemo(() => {
    const rawW = parseFloat(weightKg) || 0;
    const kg = weightUnit === 'lb' ? rawW * 0.453592 : rawW;
    if (kg <= 0) return { proteinG: 0, fatG: 0, carbsG: 0 };
    const proteinG = Math.round(kg * 1.6);
    const fatG = Math.round(kg * 0.8);
    const proteinKcal = proteinG * 4;
    const fatKcal = fatG * 9;
    const carbsKcal = Math.max(0, Math.round(targets.target - proteinKcal - fatKcal));
    const carbsG = Math.round(carbsKcal / 4);
    return { proteinG, fatG, carbsG };
  }, [targets.target, weightKg, weightUnit]);

  const waterTargetMl = useMemo(() => {
    const rawW = parseFloat(weightKg) || 0;
    const kg = weightUnit === 'lb' ? rawW * 0.453592 : rawW;
    if (kg <= 0) return 0;
    return Math.round(kg * 35); // ~35 ml/kg/day practical target
  }, [weightKg, weightUnit]);

  const saveToday = async () => {
    const today = new Date().toISOString().split('T')[0];
    const logs = await getDietLogs();
    const mealEntries = todayLog?.mealEntries ?? [];
    const caloriesFromMeals = mealEntries.reduce((sum, m) => sum + m.calories, 0);
    const proteinFromMeals = mealEntries.reduce((sum, m) => sum + m.proteinG, 0);
    const carbsFromMeals = mealEntries.reduce((sum, m) => sum + m.carbsG, 0);
    const fatFromMeals = mealEntries.reduce((sum, m) => sum + m.fatG, 0);
    const nextLog: DietLog = {
      id: todayLog?.id ?? `diet-${Date.now()}`,
      date: today,
      calories: (parseInt(consumedCalories) || 0) + caloriesFromMeals,
      targetCalories: Math.round(targets.target),
      proteinG: proteinFromMeals,
      carbsG: carbsFromMeals,
      fatG: fatFromMeals,
      waterGlasses: parseInt(waterGlasses) || 0,
      mood: todayLog?.mood ?? 3,
      energy: todayLog?.energy ?? 3,
      wins: todayLog?.wins ?? [],
      challenges: todayLog?.challenges ?? [],
      weight: parseFloat(weightKg) || undefined,
      mealEntries,
    };

    const filtered = logs.filter((l) => l.date !== today);
    await saveDietLogs([...filtered, nextLog]);
    setTodayLog(nextLog);
    await loadTodayLog();
    Alert.alert('Saved', 'Diet log updated for today.');
  };

  const addMealEntry = async () => {
    if (!foodName.trim()) {
      Alert.alert('Food name required', 'Enter a food item name.');
      return;
    }
    const newEntry = {
      id: `meal-${Date.now()}`,
      meal: mealType,
      name: foodName.trim(),
      calories: parseInt(foodCalories) || 0,
      proteinG: parseInt(foodProtein) || 0,
      carbsG: parseInt(foodCarbs) || 0,
      fatG: parseInt(foodFat) || 0,
      timestamp: new Date().toISOString(),
    };
    const current = todayLog ?? {
      id: `diet-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      mood: 3,
      energy: 3,
      wins: [],
      challenges: [],
      mealEntries: [],
    };
    const nextLog: DietLog = {
      ...current,
      mealEntries: [...(current.mealEntries ?? []), newEntry],
    };
    const logs = await getDietLogs();
    const filtered = logs.filter((l) => l.date !== nextLog.date);
    await saveDietLogs([...filtered, nextLog]);
    setTodayLog(nextLog);
    setFoodName('');
    setFoodCalories('');
    setFoodProtein('');
    setFoodCarbs('');
    setFoodFat('');
    await loadTodayLog();
  };

  const macroAdherence = useMemo(() => {
    const p = todayLog?.proteinG ?? 0;
    const cbs = todayLog?.carbsG ?? 0;
    const f = todayLog?.fatG ?? 0;
    const proteinPct = macros.proteinG > 0 ? Math.min(100, Math.round((p / macros.proteinG) * 100)) : 0;
    const carbsPct = macros.carbsG > 0 ? Math.min(100, Math.round((cbs / macros.carbsG) * 100)) : 0;
    const fatPct = macros.fatG > 0 ? Math.min(100, Math.round((f / macros.fatG) * 100)) : 0;
    return { proteinPct, carbsPct, fatPct };
  }, [todayLog?.proteinG, todayLog?.carbsG, todayLog?.fatG, macros.proteinG, macros.carbsG, macros.fatG]);

  const suggestions = useMemo(() => {
    const tips: string[] = [];
    if ((todayLog?.proteinG ?? 0) < macros.proteinG * 0.7) tips.push('High protein needed: add eggs, paneer, tofu, chicken, or dal.');
    if ((parseInt(waterGlasses) || 0) * 250 < waterTargetMl * 0.7) tips.push('Hydrate now: drink 2 glasses in next 60 minutes.');
    const dinnerCalories = (todayLog?.mealEntries ?? [])
      .filter((m) => m.meal === 'dinner')
      .reduce((sum, m) => sum + m.calories, 0);
    const totalCal = (todayLog?.calories ?? 0);
    if (totalCal > 0 && dinnerCalories / totalCal > 0.45) {
      tips.push('Reduce evening calorie density: shift some calories to breakfast/lunch.');
    }
    if (tips.length === 0) tips.push('Great balance today. Keep consistency and pre-log tomorrow meals.');
    return tips;
  }, [todayLog, macros.proteinG, waterGlasses, waterTargetMl]);

  const weeklyChart = useMemo(() => {
    const logsByDate = new Map(weeklyLogs.map((l) => [l.date, l]));
    const labels: string[] = [];
    const calories: number[] = [];
    const targetsData: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const l = logsByDate.get(key);
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      calories.push(l?.calories ?? 0);
      targetsData.push(l?.targetCalories ?? Math.round(targets.target));
    }
    return { labels, calories, targetsData };
  }, [weeklyLogs, targets.target]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]}>Diet Tracker</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Calorie Calculator</Text>
          <Text style={[styles.cardSub, { color: c.mutedText }]}>Aligned with mainstream calorie calculator methods</Text>

          <Text style={[styles.metric, { color: c.text, marginBottom: 6 }]}>Gender</Text>
          <View style={styles.row}>
            <Pill label="Male" active={sex === 'male'} onPress={() => setSex('male')} />
            <Pill label="Female" active={sex === 'female'} onPress={() => setSex('female')} />
          </View>

          <Text style={[styles.metric, { color: c.text, marginBottom: 6 }]}>Formula</Text>
          <View style={styles.row}>
            <Pill label="Mifflin" active={formula === 'mifflin'} onPress={() => setFormula('mifflin')} />
            <Pill label="Harris" active={formula === 'harris'} onPress={() => setFormula('harris')} />
            <Pill label="Katch" active={formula === 'katch'} onPress={() => setFormula('katch')} />
          </View>
          {formula === 'katch' ? (
            <TextInput
              style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
              value={bodyFatPct}
              onChangeText={setBodyFatPct}
              keyboardType="decimal-pad"
              placeholder="Body fat % (for Katch)"
              placeholderTextColor={c.mutedText}
            />
          ) : null}

          <TextInput style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]} value={age} onChangeText={setAge} keyboardType="number-pad" placeholder="Age (years)" placeholderTextColor={c.mutedText} />
          <TextInput style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]} value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" placeholder="Height (cm)" placeholderTextColor={c.mutedText} />
          <TextInput style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder={`Weight (${weightUnit})`} placeholderTextColor={c.mutedText} />

          <View style={styles.row}>
            <Pill label="Sedentary" active={activity === 'sedentary'} onPress={() => setActivity('sedentary')} />
            <Pill label="Light" active={activity === 'light'} onPress={() => setActivity('light')} />
            <Pill label="Moderate" active={activity === 'moderate'} onPress={() => setActivity('moderate')} />
          </View>
          <View style={styles.row}>
            <Pill label="Active" active={activity === 'active'} onPress={() => setActivity('active')} />
            <Pill label="Very Active" active={activity === 'very_active'} onPress={() => setActivity('very_active')} />
          </View>

          <View style={styles.row}>
            <Pill label="Maintain" active={goal === 'maintain'} onPress={() => setGoal('maintain')} />
            <Pill label="Lose" active={goal === 'lose'} onPress={() => setGoal('lose')} />
            <Pill label="Gain" active={goal === 'gain'} onPress={() => setGoal('gain')} />
          </View>

          <Text style={[styles.metric, { color: c.text }]}>BMR: {Math.round(targets.bmr)} kcal</Text>
          <Text style={[styles.metric, { color: c.text }]}>TDEE: {Math.round(targets.tdee)} kcal</Text>
          <Text style={[styles.metricStrong, { color: c.primary }]}>Daily target: {Math.round(targets.target)} kcal</Text>
          <Text style={[styles.metric, { color: c.text }]}>BMI: {bmi.toFixed(1)} ({bmiLabel})</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Calorie Plans</Text>
          <Text style={[styles.metric, { color: c.text }]}>Maintain: {caloriePlans.maintain} kcal/day</Text>
          <Text style={[styles.metric, { color: c.text }]}>Mild loss (~{weeklyLoss.mild} {weeklyLoss.unit}): {caloriePlans.mild} kcal/day</Text>
          <Text style={[styles.metric, { color: c.text }]}>Loss (~{weeklyLoss.loss} {weeklyLoss.unit}): {caloriePlans.loss} kcal/day</Text>
          <Text style={[styles.metric, { color: c.text }]}>Extreme (~{weeklyLoss.extreme} {weeklyLoss.unit}): {caloriePlans.extreme} kcal/day</Text>
          <Text style={[styles.cardSub, { color: c.mutedText, marginTop: 8 }]}>
            Safer range is usually up to ~1000 kcal/day deficit. Adjust with medical guidance when needed.
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Zigzag Calorie Cycling (Sample)</Text>
          {zigzag.map((d) => (
            <Text key={d.day} style={[styles.metric, { color: c.mutedText }]}>
              {d.day}: mild {d.mild} · loss {d.loss} · extreme {d.extreme}
            </Text>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Activity Impact Table</Text>
          <Text style={[styles.cardSub, { color: c.mutedText }]}>Estimated additional weight loss with higher activity</Text>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeadText, { color: c.text, flex: 1.6 }]}>Activity level</Text>
            <Text style={[styles.tableHeadText, { color: c.text, flex: 0.8, textAlign: 'right' }]}>Weight lost/{activityImpact.unit}</Text>
          </View>
          {activityImpact.rows.map((row, idx) => (
            <View key={`${row.label}-${idx}`} style={[styles.tableRow, { borderColor: c.border }]}>
              <Text style={[styles.tableCellText, { color: c.mutedText, flex: 1.6 }]}>{row.label}</Text>
              <Text style={[styles.tableCellValue, { color: c.primary, flex: 0.8, textAlign: 'right' }]}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Smart Daily Targets</Text>
          <Text style={[styles.metric, { color: c.text }]}>Protein: {macros.proteinG} g</Text>
          <Text style={[styles.metric, { color: c.text }]}>Fat: {macros.fatG} g</Text>
          <Text style={[styles.metric, { color: c.text }]}>Carbs: {macros.carbsG} g</Text>
          <Text style={[styles.metric, { color: c.info }]}>Water target: {waterTargetMl} ml/day</Text>
          <Text style={[styles.cardSub, { color: c.mutedText, marginTop: 6 }]}>
            Meal split idea: Breakfast 25% • Lunch 35% • Dinner 30% • Snacks 10%
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Today Log</Text>
          <TextInput style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]} value={consumedCalories} onChangeText={setConsumedCalories} keyboardType="number-pad" placeholder="Calories consumed today" placeholderTextColor={c.mutedText} />
          <TextInput style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]} value={waterGlasses} onChangeText={setWaterGlasses} keyboardType="number-pad" placeholder="Water glasses" placeholderTextColor={c.mutedText} />

          <Text style={[styles.metricStrong, { color: remaining >= 0 ? c.success : c.danger }]}>
            {remaining >= 0 ? `${remaining} kcal remaining` : `${Math.abs(remaining)} kcal over target`}
          </Text>
          <Text style={[styles.metric, { color: c.mutedText }]}>
            Approx food budget marker: {currencySymbol}{Math.max(0, Math.round((parseInt(consumedCalories) || 0) * 0.01))}
          </Text>

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: c.primary }]} onPress={saveToday} activeOpacity={0.85}>
            <Text style={styles.saveText}>Save Today</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Food Item Quick Logger (Meal-wise)</Text>
          <View style={styles.row}>
            {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((m) => (
              <Pill key={m} label={m} active={mealType === m} onPress={() => setMealType(m)} />
            ))}
          </View>
          <TextInput style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]} value={foodName} onChangeText={setFoodName} placeholder="Food item name" placeholderTextColor={c.mutedText} />
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half, { color: c.text, backgroundColor: c.surfaceElevated }]} value={foodCalories} onChangeText={setFoodCalories} keyboardType="number-pad" placeholder="kcal" placeholderTextColor={c.mutedText} />
            <TextInput style={[styles.input, styles.half, { color: c.text, backgroundColor: c.surfaceElevated }]} value={foodProtein} onChangeText={setFoodProtein} keyboardType="number-pad" placeholder="Protein g" placeholderTextColor={c.mutedText} />
          </View>
          <View style={styles.row}>
            <TextInput style={[styles.input, styles.half, { color: c.text, backgroundColor: c.surfaceElevated }]} value={foodCarbs} onChangeText={setFoodCarbs} keyboardType="number-pad" placeholder="Carbs g" placeholderTextColor={c.mutedText} />
            <TextInput style={[styles.input, styles.half, { color: c.text, backgroundColor: c.surfaceElevated }]} value={foodFat} onChangeText={setFoodFat} keyboardType="number-pad" placeholder="Fat g" placeholderTextColor={c.mutedText} />
          </View>
          <TouchableOpacity style={[styles.saveButton, { backgroundColor: c.success }]} onPress={addMealEntry} activeOpacity={0.85}>
            <Text style={styles.saveText}>Add Food Entry</Text>
          </TouchableOpacity>
          <Text style={[styles.cardSub, { color: c.mutedText, marginTop: 10 }]}>
            Entries today: {(todayLog?.mealEntries ?? []).length}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Weekly Diet Analytics</Text>
          <Text style={[styles.cardSub, { color: c.mutedText }]}>Calories vs Target (Last 7 days)</Text>
          <LineChart
            data={{
              labels: weeklyChart.labels,
              datasets: [
                { data: weeklyChart.calories, color: () => c.primary },
                { data: weeklyChart.targetsData, color: () => c.accent },
              ],
              legend: ['Calories', 'Target'],
            }}
            width={Math.max(280, width - 68)}
            height={220}
            chartConfig={{
              backgroundColor: c.surface,
              backgroundGradientFrom: c.surface,
              backgroundGradientTo: c.surface,
              decimalPlaces: 0,
              color: () => c.primary,
              labelColor: () => c.text,
            }}
            bezier
            style={{ borderRadius: 12, marginTop: 8 }}
          />
          <Text style={[styles.metric, { color: c.text, marginTop: 10 }]}>Macro adherence today</Text>
          <Text style={[styles.metric, { color: c.mutedText }]}>Protein: {macroAdherence.proteinPct}% · Carbs: {macroAdherence.carbsPct}% · Fat: {macroAdherence.fatPct}%</Text>
        </View>

        <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Auto Suggestions</Text>
          {suggestions.map((tip, idx) => (
            <Text key={idx} style={[styles.metric, { color: c.mutedText, lineHeight: 20 }]}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: active ? '#0EA5E9' : '#1F293710',
        marginRight: 8,
        marginBottom: 8,
      }}
      activeOpacity={0.85}
    >
      <Text style={{ color: active ? '#fff' : '#111827', fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
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
  row: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 2, justifyContent: 'space-between' },
  half: { width: '48%' },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#00000022',
  },
  tableHeadText: {
    fontSize: 12,
    fontWeight: '800',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tableCellText: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    paddingRight: 8,
  },
  tableCellValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  input: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, marginBottom: 10, fontSize: 14 },
  metric: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  metricStrong: { fontSize: 16, fontWeight: '900', marginTop: 8 },
  saveButton: { borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});

