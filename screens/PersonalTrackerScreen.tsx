import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, FlatList, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/ui/Card';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCravingLogs, getDietLogs, getQuitProfile } from '../lib/storage';
import { getActivityData } from '../lib/sensorTracking';
import {
  cancelTrackReminder,
  getPersonalTracks,
  getTrackLast7,
  getTrackStreak,
  PersonalTrack,
  PersonalTrackCategory,
  savePersonalTracks,
  scheduleTrackReminder,
  toDateKey,
} from '../lib/personalTracking';

const categories: PersonalTrackCategory[] = ['diet', 'quit', 'running', 'custom'];
const PERSONAL_TRACK_DRAFT_KEY = '@personal_track_form_draft_v1';

type PersonalTrackDraft = {
  title: string;
  category: PersonalTrackCategory;
  targetPerWeek: string;
  reminderEnabled: boolean;
  reminderTime: string;
  note: string;
  triggerContext: string;
  fallbackAction: string;
  sessionMinutes: string;
  calorieCap: string;
};
type DashboardStats = {
  todayCalories: number;
  todayTarget: number;
  avgCalories7: number;
  avgSteps7: number;
  cravings7: number;
  quitDays: number;
  avgTarget7: number;
};

export default function PersonalTrackerScreen() {
  const navigation = useNavigation<any>();
  const { tokens } = useTheme();
  const c = tokens.colors;

  const [tracks, setTracks] = useState<PersonalTrack[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<PersonalTrackCategory>('custom');
  const [targetPerWeek, setTargetPerWeek] = useState('5');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [note, setNote] = useState('');
  const [triggerContext, setTriggerContext] = useState('');
  const [fallbackAction, setFallbackAction] = useState('');
  const [sessionMinutes, setSessionMinutes] = useState('');
  const [calorieCap, setCalorieCap] = useState('');
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardStats>({
    todayCalories: 0,
    todayTarget: 0,
    avgCalories7: 0,
    avgSteps7: 0,
    cravings7: 0,
    quitDays: 0,
    avgTarget7: 0,
  });

  useEffect(() => {
    loadTracks();
    loadDraft();
  }, []);

  const loadTracks = async () => {
    const [loadedTracks, dietLogs, quitProfile, cravingLogs, activity] = await Promise.all([
      getPersonalTracks(),
      getDietLogs(),
      getQuitProfile(),
      getCravingLogs(),
      getActivityData(),
    ]);
    setTracks(loadedTracks);

    const today = toDateKey();
    const todayDiet = dietLogs.find((d) => d.date === today);
    const last7Diet = [...dietLogs].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
    const avgCalories7 =
      last7Diet.length === 0
        ? 0
        : Math.round(last7Diet.reduce((sum, d) => sum + (d.calories ?? 0), 0) / last7Diet.length);
    const avgTarget7 =
      last7Diet.length === 0
        ? 0
        : Math.round(last7Diet.reduce((sum, d) => sum + (d.targetCalories ?? 0), 0) / last7Diet.length);
    const avgSteps7 =
      activity.length === 0
        ? 0
        : Math.round(activity.slice(-7).reduce((sum, d) => sum + (d.steps ?? 0), 0) / Math.max(1, Math.min(7, activity.length)));
    const cravings7 = cravingLogs.filter((c) => {
      const date = c.timestamp.slice(0, 10);
      const d = new Date(date).getTime();
      return Date.now() - d <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const quitDays = quitProfile
      ? Math.max(0, Math.floor((Date.now() - new Date(quitProfile.startDate).getTime()) / 86400000))
      : 0;

    setDashboard({
      todayCalories: todayDiet?.calories ?? 0,
      todayTarget: todayDiet?.targetCalories ?? 0,
      avgCalories7,
      avgSteps7,
      cravings7,
      quitDays,
      avgTarget7,
    });
  };

  const loadDraft = async () => {
    try {
      const raw = await AsyncStorage.getItem(PERSONAL_TRACK_DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw) as PersonalTrackDraft;
      setTitle(d.title ?? '');
      setCategory(d.category ?? 'custom');
      setTargetPerWeek(d.targetPerWeek ?? '5');
      setReminderEnabled(Boolean(d.reminderEnabled));
      setReminderTime(d.reminderTime ?? '20:00');
      setNote(d.note ?? '');
      setTriggerContext(d.triggerContext ?? '');
      setFallbackAction(d.fallbackAction ?? '');
      setSessionMinutes(d.sessionMinutes ?? '');
      setCalorieCap(d.calorieCap ?? '');
    } catch {
      // ignore malformed draft
    }
  };

  useEffect(() => {
    if (editingTrackId) return; // do not overwrite edit form with draft logic
    const draft: PersonalTrackDraft = {
      title,
      category,
      targetPerWeek,
      reminderEnabled,
      reminderTime,
      note,
      triggerContext,
      fallbackAction,
      sessionMinutes,
      calorieCap,
    };
    AsyncStorage.setItem(PERSONAL_TRACK_DRAFT_KEY, JSON.stringify(draft)).catch(() => {
      // non-blocking
    });
  }, [
    editingTrackId,
    title,
    category,
    targetPerWeek,
    reminderEnabled,
    reminderTime,
    note,
    triggerContext,
    fallbackAction,
    sessionMinutes,
    calorieCap,
  ]);

  const overall = useMemo(() => {
    const total = tracks.length;
    const avg7 = total === 0 ? 0 : tracks.reduce((sum, t) => sum + getTrackLast7(t), 0) / total;
    const bestStreak = tracks.length === 0 ? 0 : Math.max(...tracks.map(getTrackStreak), 0);
    return { total, avg7, bestStreak };
  }, [tracks]);

  const coachInsights = useMemo(() => {
    const lines: string[] = [];
    if (dashboard.todayTarget > 0) {
      const diff = dashboard.todayCalories - dashboard.todayTarget;
      if (diff > 150) lines.push(`Today is +${diff} above your calorie budget. Keep dinner lighter and protein-first.`);
      else if (diff < -150) lines.push(`Today is ${Math.abs(diff)} below budget. Add one balanced mini meal for recovery.`);
      else lines.push('Today is close to your budget. Keep consistency over perfection.');
    }
    if (dashboard.avgSteps7 > 0) {
      lines.push(`Your 7-day movement average is ${dashboard.avgSteps7.toLocaleString()} steps.`);
    }
    if (dashboard.cravings7 > 0) {
      lines.push(`Cravings check: ${dashboard.cravings7} logs in 7 days. Pre-plan 1 rescue action for trigger moments.`);
    }
    if (dashboard.quitDays > 0) {
      lines.push(`Quit streak: ${dashboard.quitDays} days. Protect the streak with short fallback routines.`);
    }
    if (lines.length === 0) lines.push('Start logging diet and activity to unlock personalized coaching insights.');
    return lines;
  }, [dashboard]);

  const weeklyScore = useMemo(() => {
    const calorieScore = (() => {
      if (!dashboard.avgTarget7 || !dashboard.avgCalories7) return 40;
      const deviation = Math.abs(dashboard.avgCalories7 - dashboard.avgTarget7) / dashboard.avgTarget7;
      return Math.max(0, Math.min(100, Math.round(100 - deviation * 220)));
    })();
    const stepsScore = (() => {
      if (!dashboard.avgSteps7) return 35;
      return Math.max(0, Math.min(100, Math.round((dashboard.avgSteps7 / 9000) * 100)));
    })();
    const completionScore = (() => {
      if (tracks.length === 0) return 35;
      const avgPct =
        tracks.reduce((sum, t) => sum + Math.min(1, getTrackLast7(t) / Math.max(1, t.targetPerWeek)), 0) /
        tracks.length;
      return Math.round(avgPct * 100);
    })();
    const raw = Math.round(calorieScore * 0.45 + stepsScore * 0.25 + completionScore * 0.3);
    const score = Math.max(0, Math.min(100, raw));
    const zone: 'red' | 'yellow' | 'green' = score < 45 ? 'red' : score < 75 ? 'yellow' : 'green';
    return { score, zone, calorieScore, stepsScore, completionScore };
  }, [dashboard.avgCalories7, dashboard.avgTarget7, dashboard.avgSteps7, tracks]);

  const scoreColor = weeklyScore.zone === 'green' ? c.success : weeklyScore.zone === 'yellow' ? c.accent : c.danger;
  const scoreLabel =
    weeklyScore.zone === 'green' ? 'On Track' : weeklyScore.zone === 'yellow' ? 'Needs Attention' : 'At Risk';

  const plusTenPlan = useMemo(() => {
    const ordered = [
      { key: 'calorie', value: weeklyScore.calorieScore },
      { key: 'steps', value: weeklyScore.stepsScore },
      { key: 'completion', value: weeklyScore.completionScore },
    ].sort((a, b) => a.value - b.value);
    const weakest = ordered[0]?.key ?? 'calorie';

    if (weakest === 'calorie') {
      return {
        title: 'Add +10 by tightening calorie consistency',
        points: [
          'Pre-log dinner before 6 PM for the next 5 days.',
          'Keep final daily intake within ±150 of your target.',
          'Use one fixed high-protein snack to avoid late overeating.',
        ],
      };
    }
    if (weakest === 'steps') {
      return {
        title: 'Add +10 by raising movement baseline',
        points: [
          'Add one 12-minute walk after lunch daily.',
          'Set a floor target: hit at least 7,500 for 5 of next 7 days.',
          'Use a fallback: 5-minute brisk walk whenever a session is missed.',
        ],
      };
    }
    return {
      title: 'Add +10 by increasing track completion',
      points: [
        'Pick your top 2 tracks and complete them first each day.',
        'Schedule reminders at real-life trigger times, not ideal times.',
        'Use 2-minute fallback actions so misses still count as momentum.',
      ],
    };
  }, [weeklyScore.calorieScore, weeklyScore.stepsScore, weeklyScore.completionScore]);

  const ensureTemplateTrack = async (cat: PersonalTrackCategory) => {
    if (tracks.some((t) => t.category === cat)) {
      Alert.alert('Already exists', `You already have a ${cat} track.`);
      return;
    }
    const template: Record<PersonalTrackCategory, Omit<PersonalTrack, 'id' | 'createdAt'>> = {
      diet: {
        title: 'Stay within calorie budget',
        category: 'diet',
        targetPerWeek: 7,
        reminderEnabled: true,
        reminderTime: '20:00',
        completedDates: [],
        note: 'Trigger: late-night snacking | Fallback: fruit + water first',
      },
      running: {
        title: 'Run or brisk walk',
        category: 'running',
        targetPerWeek: 4,
        reminderEnabled: true,
        reminderTime: '18:30',
        completedDates: [],
        note: 'Session: 30 min | Fallback: 10 min walk',
      },
      quit: {
        title: 'Craving defense routine',
        category: 'quit',
        targetPerWeek: 7,
        reminderEnabled: true,
        reminderTime: '08:00',
        completedDates: [],
        note: 'Trigger: stress/coffee | Fallback: 4-7-8 breathing + water',
      },
      custom: {
        title: 'Personal commitment',
        category: 'custom',
        targetPerWeek: 5,
        reminderEnabled: false,
        reminderTime: '20:00',
        completedDates: [],
        note: 'Your personal fallback action',
      },
    };
    const base = template[cat];
    const next: PersonalTrack = {
      ...base,
      id: `track-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...tracks, next];
    await savePersonalTracks(updated);
    setTracks(updated);
    Alert.alert('Template added', `${cat} template was added to your tracker.`);
  };

  const upsertTrack = async () => {
    if (!title.trim()) {
      Alert.alert('Track title required', 'Please enter what you want to track.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(reminderTime)) {
      Alert.alert('Invalid reminder time', 'Use HH:MM format, e.g. 08:30');
      return;
    }
    const existing = editingTrackId ? tracks.find((t) => t.id === editingTrackId) : undefined;
    const base: PersonalTrack = existing ?? {
      id: `track-${Date.now()}`,
      title: '',
      category: 'custom',
      targetPerWeek: 5,
      reminderEnabled: false,
      reminderTime: '20:00',
      completedDates: [],
      createdAt: new Date().toISOString(),
    };

    try {
      if (existing?.notificationId) {
        await cancelTrackReminder(existing.notificationId);
      }

      const next: PersonalTrack = {
        ...base,
        title: title.trim(),
        category,
        targetPerWeek: Math.max(1, parseInt(targetPerWeek || '1', 10)),
        reminderEnabled,
        reminderTime,
      note:
        [
          note.trim(),
          triggerContext ? `Trigger: ${triggerContext}` : '',
          fallbackAction ? `Fallback: ${fallbackAction}` : '',
          sessionMinutes ? `Session: ${sessionMinutes} min` : '',
          calorieCap ? `Calorie cap: ${calorieCap}` : '',
        ]
          .filter(Boolean)
          .join(' | ') || undefined,
      };
      if (next.reminderEnabled) next.notificationId = await scheduleTrackReminder(next);

      const updated = existing
        ? tracks.map((t) => (t.id === existing.id ? next : t))
        : [...tracks, next];

      await savePersonalTracks(updated);
      setTracks(updated);
      setTitle('');
      setCategory('custom');
      setTargetPerWeek('5');
      setReminderTime('20:00');
      setReminderEnabled(false);
      setNote('');
      setTriggerContext('');
      setFallbackAction('');
      setSessionMinutes('');
      setCalorieCap('');
      setEditingTrackId(null);
      await AsyncStorage.removeItem(PERSONAL_TRACK_DRAFT_KEY);
      Alert.alert('Saved', existing ? 'Personalized track updated.' : 'Personalized track added.');
    } catch {
      Alert.alert('Save failed', 'Could not save track. Please try again.');
    }
  };

  const toggleDoneToday = async (track: PersonalTrack) => {
    const today = toDateKey();
    const hasDone = track.completedDates.includes(today);
    const completedDates = hasDone ? track.completedDates.filter((d) => d !== today) : [...track.completedDates, today];
    const updatedTrack = { ...track, completedDates };
    const updated = tracks.map((t) => (t.id === track.id ? updatedTrack : t));
    setTracks(updated);
    await savePersonalTracks(updated);
  };

  const toggleReminder = async (track: PersonalTrack) => {
    let updatedTrack: PersonalTrack = { ...track };
    if (track.reminderEnabled) {
      await cancelTrackReminder(track.notificationId);
      updatedTrack = { ...track, reminderEnabled: false, notificationId: undefined };
    } else {
      const notificationId = await scheduleTrackReminder({ ...track, reminderEnabled: true });
      updatedTrack = { ...track, reminderEnabled: true, notificationId };
    }
    const updated = tracks.map((t) => (t.id === track.id ? updatedTrack : t));
    setTracks(updated);
    await savePersonalTracks(updated);
  };

  const deleteTrack = async (track: PersonalTrack) => {
    await cancelTrackReminder(track.notificationId);
    const updated = tracks.filter((t) => t.id !== track.id);
    setTracks(updated);
    await savePersonalTracks(updated);
  };

  const startEditTrack = (track: PersonalTrack) => {
    setEditingTrackId(track.id);
    setTitle(track.title);
    setCategory(track.category);
    setTargetPerWeek(String(track.targetPerWeek));
    setReminderEnabled(track.reminderEnabled);
    setReminderTime(track.reminderTime);
    const noteStr = track.note ?? '';
    setNote(noteStr.split('|').find((s) => !s.includes(':'))?.trim() ?? '');
    setTriggerContext(noteStr.match(/Trigger:\s*([^|]+)/)?.[1]?.trim() ?? '');
    setFallbackAction(noteStr.match(/Fallback:\s*([^|]+)/)?.[1]?.trim() ?? '');
    setSessionMinutes(noteStr.match(/Session:\s*(\d+)/)?.[1] ?? '');
    setCalorieCap(noteStr.match(/Calorie cap:\s*(\d+)/)?.[1] ?? '');
  };

  const selectCategory = (cat: PersonalTrackCategory) => {
    setCategory(cat);
    if (!editingTrackId) {
      if (cat === 'diet') {
        setTitle('Meal quality check');
        setTargetPerWeek('7');
        setReminderTime('13:00');
      } else if (cat === 'running') {
        setTitle('Run session');
        setTargetPerWeek('4');
        setReminderTime('18:30');
      } else if (cat === 'quit') {
        setTitle('Craving defense');
        setTargetPerWeek('7');
        setReminderTime('08:00');
      }
    }
  };

  const cancelEdit = () => {
    setEditingTrackId(null);
    setTitle('');
    setCategory('custom');
    setTargetPerWeek('5');
    setReminderEnabled(false);
    setReminderTime('20:00');
    setNote('');
    setTriggerContext('');
    setFallbackAction('');
    setSessionMinutes('');
    setCalorieCap('');
    AsyncStorage.removeItem(PERSONAL_TRACK_DRAFT_KEY).catch(() => {
      // non-blocking
    });
  };

  const exportCombinedSummary = async () => {
    const today = toDateKey();
    const dietLogs = await getDietLogs();
    const quitProfile = await getQuitProfile();
    const cravingLogs = await getCravingLogs();
    const activity = await getActivityData();

    const todayDiet = dietLogs.find((d) => d.date === today);
    const todayActivity = activity.find((a) => a.date === today);
    const cravingsToday = cravingLogs.filter((c) => c.timestamp.startsWith(today)).length;
    const quitDays = quitProfile ? Math.max(0, Math.floor((Date.now() - new Date(quitProfile.startDate).getTime()) / 86400000)) : 0;
    const avoidUnits = quitProfile ? quitDays * quitProfile.dailyAmount : 0;

    const trackLines = tracks.map((t) => {
      const done7 = getTrackLast7(t);
      const streak = getTrackStreak(t);
      return `- ${t.title} (${t.category}): streak ${streak}, last7 ${done7}/${t.targetPerWeek}`;
    });

    const summary = [
      'Progress Summary (Diet + Quit + Running + Custom)',
      '',
      `Date: ${today}`,
      '',
      'Core Metrics',
      `- Quit days: ${quitDays}`,
      `- Avoided units: ${avoidUnits}`,
      `- Cravings today: ${cravingsToday}`,
      `- Steps today: ${todayActivity?.steps?.toLocaleString() ?? 0}`,
      `- Active minutes: ${todayActivity?.activeMinutes ?? 0}`,
      `- Calories burned: ${todayActivity?.calories ?? 0}`,
      `- Calories consumed: ${todayDiet?.calories ?? 0}`,
      `- Water glasses: ${todayDiet?.waterGlasses ?? 0}`,
      '',
      'Personal Tracks',
      ...(trackLines.length > 0 ? trackLines : ['- No custom tracks yet']),
    ].join('\n');

    await Share.share({ message: summary });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <FlatList
        data={tracks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={[styles.title, { color: c.text }]}>Personalized Tracker</Text>
            <Text style={[styles.subtitle, { color: c.mutedText }]}>Track exactly what matters to you with reminders and stats</Text>

            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Metric label="Tracks" value={String(overall.total)} color={c.primary} />
                <Metric label="Avg Last 7d" value={overall.avg7.toFixed(1)} color={c.success} />
                <Metric label="Best Streak" value={String(overall.bestStreak)} color={c.accent} />
              </View>
            </Card>

            <View style={styles.quickRow}>
              <TouchableOpacity style={[styles.quickBtn, { backgroundColor: c.primary }]} onPress={() => navigation.navigate('DietTracker')}>
                <Ionicons name="restaurant" size={16} color="#fff" />
                <Text style={styles.quickBtnText}>Open Diet + Calorie Calculator</Text>
              </TouchableOpacity>
            </View>

            <Card style={styles.formCard}>
              <Text style={[styles.formTitle, { color: c.text }]}>Super Useful Coach Dashboard</Text>
              <View style={[styles.scoreWrap, { borderColor: c.border, backgroundColor: c.surfaceElevated }]}>
                <View style={styles.scoreTop}>
                  <Text style={[styles.scoreValue, { color: scoreColor }]}>{weeklyScore.score}</Text>
                  <Text style={[styles.scoreLabel, { color: scoreColor }]}>{scoreLabel}</Text>
                </View>
                <View style={[styles.scoreTrack, { backgroundColor: c.border }]}>
                  <View style={[styles.scoreFill, { backgroundColor: scoreColor, width: `${weeklyScore.score}%` }]} />
                </View>
                <Text style={[styles.scoreBreakdown, { color: c.mutedText }]}>
                  Calorie {weeklyScore.calorieScore} · Steps {weeklyScore.stepsScore} · Completion {weeklyScore.completionScore}
                </Text>
              </View>
              <View style={[styles.planWrap, { borderColor: c.border, backgroundColor: c.surfaceElevated }]}>
                <Text style={[styles.planTitle, { color: c.text }]}>{plusTenPlan.title}</Text>
                {plusTenPlan.points.map((p, idx) => (
                  <Text key={idx} style={[styles.planPoint, { color: c.mutedText }]}>
                    • {p}
                  </Text>
                ))}
              </View>
              <View style={styles.summaryRow}>
                <Metric label="Today In" value={String(dashboard.todayCalories)} color={c.primary} />
                <Metric label="7d Avg In" value={String(dashboard.avgCalories7)} color={c.accent} />
                <Metric label="7d Avg Steps" value={String(dashboard.avgSteps7)} color={c.success} />
              </View>
              <View style={{ height: 10 }} />
              {coachInsights.map((line, idx) => (
                <Text key={idx} style={[styles.trackNote, { color: c.mutedText }]}>
                  • {line}
                </Text>
              ))}
              <View style={{ height: 10 }} />
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: c.border }]} onPress={() => ensureTemplateTrack('diet')}>
                  <Ionicons name="restaurant-outline" size={14} color={c.text} />
                  <Text style={[styles.actionText, { color: c.text }]}>Add Diet Template</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: c.border }]} onPress={() => ensureTemplateTrack('running')}>
                  <Ionicons name="walk-outline" size={14} color={c.text} />
                  <Text style={[styles.actionText, { color: c.text }]}>Add Running Template</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { borderColor: c.border }]} onPress={() => ensureTemplateTrack('quit')}>
                  <Ionicons name="shield-checkmark-outline" size={14} color={c.text} />
                  <Text style={[styles.actionText, { color: c.text }]}>Add Quit Template</Text>
                </TouchableOpacity>
              </View>
            </Card>

            <Card style={styles.formCard}>
              <Text style={[styles.formTitle, { color: c.text }]}>
                {editingTrackId ? 'Edit track' : 'Create custom track'}
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Evening run, No sugar, Meditate"
                placeholderTextColor={c.mutedText}
                style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
              />
              <View style={styles.chipsRow}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => selectCategory(cat)}
                    style={[styles.chip, { backgroundColor: category === cat ? c.primary : c.surfaceElevated }]}
                  >
                    <Text style={{ color: category === cat ? '#fff' : c.text, fontSize: 12, fontWeight: '700' }}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.categoryHint, { color: c.mutedText }]}>
                {category === 'diet'
                  ? 'Diet tracker: meal quality, calorie discipline, hydration rhythm.'
                  : category === 'running'
                  ? 'Running tracker: sessions, pace habit, recovery routine.'
                  : category === 'quit'
                  ? 'Quit tracker: cravings resisted, trigger management, streak defense.'
                  : 'Custom tracker: your own metric and routine.'}
              </Text>
              {category === 'diet' ? (
                <>
                  <TextInput
                    value={calorieCap}
                    onChangeText={setCalorieCap}
                    keyboardType="number-pad"
                    placeholder="Daily calorie cap (optional)"
                    placeholderTextColor={c.mutedText}
                    style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
                  />
                  <TextInput
                    value={fallbackAction}
                    onChangeText={setFallbackAction}
                    placeholder="Fallback action (e.g., 1 healthy meal now)"
                    placeholderTextColor={c.mutedText}
                    style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
                  />
                </>
              ) : null}
              {category === 'running' ? (
                <>
                  <TextInput
                    value={sessionMinutes}
                    onChangeText={setSessionMinutes}
                    keyboardType="number-pad"
                    placeholder="Session minutes (e.g., 30)"
                    placeholderTextColor={c.mutedText}
                    style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
                  />
                  <TextInput
                    value={fallbackAction}
                    onChangeText={setFallbackAction}
                    placeholder="Fallback action (e.g., 10-min easy walk)"
                    placeholderTextColor={c.mutedText}
                    style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
                  />
                </>
              ) : null}
              {category === 'quit' ? (
                <>
                  <TextInput
                    value={triggerContext}
                    onChangeText={setTriggerContext}
                    placeholder="Main trigger context (stress/coffee/etc.)"
                    placeholderTextColor={c.mutedText}
                    style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
                  />
                  <TextInput
                    value={fallbackAction}
                    onChangeText={setFallbackAction}
                    placeholder="Rescue action (e.g., 4-7-8 breathing)"
                    placeholderTextColor={c.mutedText}
                    style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
                  />
                </>
              ) : null}
              <View style={styles.row}>
                <TextInput
                  value={targetPerWeek}
                  onChangeText={setTargetPerWeek}
                  keyboardType="number-pad"
                  placeholder="Target/week"
                  placeholderTextColor={c.mutedText}
                  style={[styles.input, styles.halfInput, { color: c.text, backgroundColor: c.surfaceElevated }]}
                />
                <TextInput
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  placeholder="Reminder HH:MM"
                  placeholderTextColor={c.mutedText}
                  style={[styles.input, styles.halfInput, { color: c.text, backgroundColor: c.surfaceElevated }]}
                />
              </View>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Deep personalization note (trigger, why, context)"
                placeholderTextColor={c.mutedText}
                style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
              />
              <TouchableOpacity
                onPress={() => setReminderEnabled((v) => !v)}
                style={[styles.toggleReminderBtn, { borderColor: c.border }]}
              >
                <Ionicons name={reminderEnabled ? 'notifications' : 'notifications-off'} size={16} color={c.text} />
                <Text style={[styles.toggleReminderText, { color: c.text }]}>
                  Reminder {reminderEnabled ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: c.primary }]} onPress={upsertTrack}>
                <Text style={styles.addBtnText}>{editingTrackId ? 'Save Changes' : 'Add Personalized Track'}</Text>
              </TouchableOpacity>
              {editingTrackId ? (
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.border }]} onPress={cancelEdit}>
                  <Text style={[styles.cancelBtnText, { color: c.text }]}>Cancel Edit</Text>
                </TouchableOpacity>
              ) : null}
            </Card>

            <TouchableOpacity style={[styles.exportBtn, { backgroundColor: c.success }]} onPress={exportCombinedSummary}>
              <Ionicons name="share-outline" size={16} color="#fff" />
              <Text style={styles.exportBtnText}>Export/Share Combined Progress</Text>
            </TouchableOpacity>
          </>
        }
        renderItem={({ item }) => {
          const doneToday = item.completedDates.includes(toDateKey());
          const streak = getTrackStreak(item);
          const done7 = getTrackLast7(item);
          const pct = Math.round((done7 / Math.max(1, item.targetPerWeek)) * 100);
          const insight =
            pct >= 100
              ? 'Target achieved: raise difficulty slightly next week.'
              : done7 === 0
              ? 'No progress this week: schedule a tiny starter action.'
              : `Needs ${Math.max(0, item.targetPerWeek - done7)} more check-ins this week.`;
          return (
            <Card style={styles.trackCard}>
              <View style={styles.trackTop}>
                <View>
                  <Text style={[styles.trackTitle, { color: c.text }]}>{item.title}</Text>
                  <Text style={[styles.trackMeta, { color: c.mutedText }]}>
                    {item.category} · target {item.targetPerWeek}/week
                  </Text>
                </View>
                <TouchableOpacity onPress={() => deleteTrack(item)} activeOpacity={0.85}>
                  <Ionicons name="trash-outline" size={18} color={c.danger} />
                </TouchableOpacity>
              </View>
              {item.note ? <Text style={[styles.trackNote, { color: c.mutedText }]}>{item.note}</Text> : null}
              <View style={styles.metricsRow}>
                <Text style={[styles.metricTiny, { color: c.primary }]}>Streak {streak}</Text>
                <Text style={[styles.metricTiny, { color: c.success }]}>Last 7d {done7}</Text>
                <Text style={[styles.metricTiny, { color: pct >= 100 ? c.success : c.accent }]}>{pct}% goal</Text>
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: c.border }]}
                  onPress={() => startEditTrack(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="create-outline" size={14} color={c.text} />
                  <Text style={[styles.actionText, { color: c.text }]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: c.border }]}
                  onPress={() => toggleReminder(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={item.reminderEnabled ? 'notifications' : 'notifications-off'} size={14} color={c.text} />
                  <Text style={[styles.actionText, { color: c.text }]}>{item.reminderEnabled ? item.reminderTime : 'Reminder off'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: doneToday ? c.success : c.primary, borderColor: 'transparent' }]}
                  onPress={() => toggleDoneToday(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={[styles.actionText, { color: '#fff' }]}>{doneToday ? 'Done today' : 'Mark done'}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.insightCard, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
                <Text style={[styles.insightTitle, { color: c.text }]}>Weekly auto-insight</Text>
                <Text style={[styles.insightText, { color: c.mutedText }]}>{insight}</Text>
              </View>
            </Card>
          );
        }}
        ListEmptyComponent={<Text style={[styles.empty, { color: c.mutedText }]}>No personalized tracks yet.</Text>}
      />
    </SafeAreaView>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Text style={{ color, fontSize: 20, fontWeight: '900' }}>{value}</Text>
      <Text style={{ color: '#6B7280', fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 24, fontWeight: '900' },
  subtitle: { fontSize: 13, marginTop: 4, marginBottom: 12, fontWeight: '600' },
  summaryCard: { padding: 14, marginBottom: 12 },
  summaryRow: { flexDirection: 'row' },
  scoreWrap: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  scoreTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  scoreValue: { fontSize: 28, fontWeight: '900' },
  scoreLabel: { fontSize: 12, fontWeight: '800' },
  scoreTrack: { height: 8, borderRadius: 999, overflow: 'hidden', marginTop: 8 },
  scoreFill: { height: '100%', borderRadius: 999 },
  scoreBreakdown: { fontSize: 11, marginTop: 8, fontWeight: '700' },
  planWrap: { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 10 },
  planTitle: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
  planPoint: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  quickRow: { marginBottom: 12 },
  quickBtn: { borderRadius: 10, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  quickBtnText: { color: '#fff', fontSize: 12, fontWeight: '800', marginLeft: 6 },
  formCard: { padding: 14, marginBottom: 14 },
  formTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  input: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, marginBottom: 10 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  categoryHint: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  toggleReminderBtn: { borderWidth: 1, borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  toggleReminderText: { marginLeft: 8, fontSize: 12, fontWeight: '700' },
  addBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  cancelBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  cancelBtnText: { fontSize: 12, fontWeight: '800' },
  exportBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 14 },
  exportBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', marginLeft: 8 },
  empty: { textAlign: 'center', marginTop: 20, fontSize: 14, fontWeight: '700' },
  trackCard: { padding: 14, marginBottom: 10 },
  trackTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackTitle: { fontSize: 15, fontWeight: '800' },
  trackMeta: { fontSize: 12, marginTop: 2, fontWeight: '600' },
  trackNote: { marginTop: 8, fontSize: 12, lineHeight: 17 },
  metricsRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  metricTiny: { fontSize: 12, fontWeight: '800' },
  actionsRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  actionBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center' },
  actionText: { fontSize: 12, fontWeight: '800', marginLeft: 6 },
  insightCard: { marginTop: 10, borderRadius: 10, borderWidth: 1, padding: 10 },
  insightTitle: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  insightText: { fontSize: 12, lineHeight: 17, fontWeight: '600' },
});

