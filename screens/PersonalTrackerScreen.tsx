import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, SafeAreaView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/ui/Card';
import { useNavigation } from '@react-navigation/native';
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

  useEffect(() => {
    loadTracks();
  }, []);

  const loadTracks = async () => {
    setTracks(await getPersonalTracks());
  };

  const overall = useMemo(() => {
    const total = tracks.length;
    const avg7 = total === 0 ? 0 : tracks.reduce((sum, t) => sum + getTrackLast7(t), 0) / total;
    const bestStreak = tracks.length === 0 ? 0 : Math.max(...tracks.map(getTrackStreak), 0);
    return { total, avg7, bestStreak };
  }, [tracks]);

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

