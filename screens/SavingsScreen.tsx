import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { QuitProfile, SavingsGoal } from '../lib/types';
import { getQuitProfile, getSavingsGoals, saveSavingsGoals } from '../lib/storage';

const DEFAULT_NEW_GOAL_NAME = 'My Savings Goal';

export default function SavingsScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();

  const [profile, setProfile] = useState<QuitProfile | null>(null);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  const [goalName, setGoalName] = useState(DEFAULT_NEW_GOAL_NAME);
  const [targetAmount, setTargetAmount] = useState('5000');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const p = await getQuitProfile();
    setProfile(p);
    if (p) {
      const g = await getSavingsGoals();
      setGoals(g);
    }
  };

  const now = new Date();
  const startDate = profile ? new Date(profile.startDate) : null;
  const diffDays = startDate ? Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const { savedMoney, totalGoalTarget } = useMemo(() => {
    if (!profile) return { savedMoney: 0, totalGoalTarget: 0 };

    const avoidedUnits = diffDays * profile.dailyAmount;
    const unitsPerPack = profile.quitType === 'smoking' ? 20 : 1;
    const savedMoneyValue = (avoidedUnits / unitsPerPack) * profile.costPerUnit;
    const totalTarget = goals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
    return { savedMoney: savedMoneyValue, totalGoalTarget: totalTarget };
  }, [diffDays, goals, profile]);

  const unlockedText = useMemo(() => {
    if (!profile) return '';
    return `${profile.currency}${savedMoney.toFixed(2)} saved`;
  }, [profile, savedMoney]);

  const addGoal = async () => {
    if (!profile) return;
    const nextGoal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      name: goalName.trim() ? goalName.trim() : DEFAULT_NEW_GOAL_NAME,
      targetAmount: parseFloat(targetAmount) || 0,
      currentAmount: 0,
      description: undefined,
      imageUri: undefined,
    };
    const updated = [...goals, nextGoal];
    setGoals(updated);
    await saveSavingsGoals(updated);
    // Keep the UI simple; no navigation change.
  };

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Savings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: isDark ? '#111' : '#f5f5f5' }]}>
            <Ionicons name="cash" size={60} color="#F97316" />
            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>Start first</Text>
            <Text style={[styles.cardDesc, { color: isDark ? '#ccc' : '#666' }]}>
              Set your quit baseline to calculate savings.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#0D9488' }]}
              onPress={() => navigation.navigate('QuitOnboarding' as never)}
            >
              <Text style={styles.primaryButtonText}>Set Up Quit</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Savings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.heroCard, { backgroundColor: isDark ? '#111' : '#f5f5f5' }]}>
          <View style={styles.heroRow}>
            <Ionicons name="cash" size={22} color="#F97316" />
            <Text style={[styles.heroText, { color: isDark ? '#fff' : '#000' }]}>{unlockedText}</Text>
          </View>
          <Text style={[styles.heroSub, { color: isDark ? '#ccc' : '#666' }]}>
            Days since start: {diffDays}
          </Text>
          <View style={styles.heroProgressWrap}>
            <Text style={[styles.heroSub, { color: isDark ? '#ccc' : '#666', marginBottom: 10 }]}>
              Goal pool target: {profile.currency}
              {totalGoalTarget.toFixed(0)}
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? '#111' : '#f5f5f5' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Your Goals</Text>
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flag-outline" size={44} color={isDark ? '#555' : '#ccc'} />
              <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#888' }]}>No goals yet.</Text>
              <Text style={[styles.emptySub, { color: isDark ? '#aaa' : '#888' }]}>
                Create one below to track progress.
              </Text>
            </View>
          ) : (
            goals.map((g) => {
              const pct = g.targetAmount > 0 ? Math.min(100, (g.currentAmount / g.targetAmount) * 100) : 0;
              return (
                <View key={g.id} style={styles.goalCard}>
                  <View style={styles.goalTop}>
                    <Text style={[styles.goalName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                      {g.name}
                    </Text>
                    <Text style={[styles.goalPct, { color: isDark ? '#ccc' : '#666' }]}>{pct.toFixed(0)}%</Text>
                  </View>
                  <View style={styles.goalBar}>
                    <View style={[styles.goalBarFill, { width: `${pct}%`, backgroundColor: '#0EA5E9' }]} />
                  </View>
                  <Text style={[styles.goalMeta, { color: isDark ? '#ccc' : '#666' }]}>
                    {profile.currency}
                    {g.currentAmount.toFixed(0)} / {profile.currency}
                    {g.targetAmount.toFixed(0)}
                  </Text>
                </View>
              );
            })
          )}

          <View style={styles.addGoalWrap}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000', fontSize: 16, marginTop: 14 }]}>
              Add a Goal
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#222' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
              value={goalName}
              onChangeText={setGoalName}
              placeholder="Goal name"
              placeholderTextColor={isDark ? '#666' : '#ccc'}
            />
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#222' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
              value={targetAmount}
              onChangeText={setTargetAmount}
              keyboardType="numeric"
              placeholder="Target amount"
              placeholderTextColor={isDark ? '#666' : '#ccc'}
            />
            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#0EA5E9' }]} onPress={addGoal}>
              <Text style={styles.primaryButtonText}>Create Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: { fontSize: 20, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 120 },
  card: { borderRadius: 16, padding: 18, alignItems: 'center' },
  cardTitle: { fontSize: 20, fontWeight: '800', marginTop: 14, marginBottom: 6, textAlign: 'center' },
  cardDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  primaryButton: { borderRadius: 25, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', marginTop: 6 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  heroCard: { borderRadius: 16, padding: 18, marginBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroText: { fontSize: 18, fontWeight: '900', marginLeft: 4 },
  heroSub: { marginTop: 8, fontSize: 13, fontWeight: '700' },
  heroProgressWrap: { marginTop: 12 },
  section: { borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 36 },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: '900' },
  emptySub: { marginTop: 6, fontSize: 13, fontWeight: '700' },
  goalCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00000022',
  },
  goalTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalName: { fontSize: 15, fontWeight: '900', flex: 1, marginRight: 10 },
  goalPct: { fontSize: 13, fontWeight: '800' },
  goalBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#00000022',
    overflow: 'hidden',
    marginTop: 10,
  },
  goalBarFill: { height: 8, borderRadius: 999 },
  goalMeta: { marginTop: 10, fontSize: 12, fontWeight: '800' },
  addGoalWrap: { marginTop: 10, paddingTop: 6 },
  input: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#00000022',
    marginBottom: 10,
    fontWeight: '700',
  },
});

