import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { QuitProfile, HealthMilestone } from '../lib/types';
import { getQuitProfile } from '../lib/storage';

const healthMilestones: HealthMilestone[] = [
  { days: 0.0139, title: '20 minutes', description: 'Heart rate drops', icon: 'heart', unlocked: false },
  { days: 0.333, title: '8 hours', description: 'Oxygen levels normalize', icon: 'leaf', unlocked: false },
  { days: 1, title: '24 hours', description: 'Carbon monoxide gone', icon: 'cloud-off', unlocked: false },
  { days: 2, title: '48 hours', description: 'Taste & smell improve', icon: 'eye', unlocked: false },
  { days: 3, title: '72 hours', description: 'Bronchial tubes relax', icon: 'water', unlocked: false },
  { days: 14, title: '2 weeks', description: 'Circulation improves', icon: 'pulse', unlocked: false },
  { days: 30, title: '1 month', description: 'Lung function up 30%', icon: 'fitness', unlocked: false },
  { days: 90, title: '3 months', description: 'Coughing decreases', icon: 'medical', unlocked: false },
  { days: 180, title: '6 months', description: 'Energy levels rise', icon: 'battery-full', unlocked: false },
  { days: 365, title: '1 year', description: 'Heart disease risk halves', icon: 'shield-checkmark', unlocked: false },
  { days: 1825, title: '5 years', description: 'Stroke risk normalizes', icon: 'ribbon', unlocked: false },
  { days: 3650, title: '10 years', description: 'Lung cancer risk halves', icon: 'trophy', unlocked: false },
];

export default function HealthTimelineScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();

  const [profile, setProfile] = useState<QuitProfile | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const p = await getQuitProfile();
    setProfile(p);
  };

  const diffDays = useMemo(() => {
    if (!profile) return 0;
    const startDate = new Date(profile.startDate);
    const now = new Date();
    return Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [profile]);

  const unlocked = useMemo(() => {
    return healthMilestones.map((m) => ({
      ...m,
      unlocked: diffDays >= m.days,
    }));
  }, [diffDays]);

  const next = useMemo(() => {
    return unlocked.find((m) => diffDays < m.days) || null;
  }, [diffDays, unlocked]);

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Health Timeline</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: isDark ? '#111' : '#f5f5f5' }]}>
            <Ionicons name="heart" size={60} color="#6366F1" />
            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>Start first</Text>
            <Text style={[styles.cardDesc, { color: isDark ? '#ccc' : '#666' }]}>
              Configure your quit profile to unlock milestones.
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

  const progressPct = next ? Math.max(0, Math.min(100, (diffDays / next.days) * 100)) : 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Health Timeline</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.hero, { backgroundColor: isDark ? '#111' : '#f5f5f5' }]}>
          <View style={styles.heroRow}>
            <Ionicons name="pulse" size={22} color="#10B981" />
            <Text style={[styles.heroTitle, { color: isDark ? '#fff' : '#000' }]}>Day {diffDays}</Text>
          </View>
          {next ? (
            <>
              <Text style={[styles.heroSub, { color: isDark ? '#ccc' : '#666' }]}>Next: {next.title}</Text>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${progressPct}%`, backgroundColor: '#0EA5E9' }]} />
              </View>
              <Text style={[styles.heroMeta, { color: isDark ? '#ccc' : '#666' }]}>
                {Math.round(progressPct)}% toward the next milestone
              </Text>
            </>
          ) : (
            <Text style={[styles.heroSub, { color: isDark ? '#ccc' : '#666' }]}>All milestones unlocked.</Text>
          )}
        </View>

        {unlocked.map((m) => (
          <View key={`${m.days}-${m.title}`} style={[styles.milestoneCard, { backgroundColor: isDark ? '#111' : '#f5f5f5' }]}>
            <View style={[styles.icon, { backgroundColor: m.unlocked ? profile.quitType === 'smoking' ? '#EF4444' : '#6366F1' : isDark ? '#222' : '#eee' }]}>
              <Ionicons name={m.icon as any} size={22} color={m.unlocked ? '#fff' : isDark ? '#777' : '#999'} />
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={[styles.milestoneTitle, { color: isDark ? '#fff' : '#000', opacity: m.unlocked ? 1 : 0.6 }]}>
                {m.title}
              </Text>
              <Text style={[styles.milestoneDesc, { color: isDark ? '#ccc' : '#666', opacity: m.unlocked ? 1 : 0.6 }]}>
                {m.description}
              </Text>
            </View>
            {m.unlocked ? <Ionicons name="checkmark-circle" size={24} color="#10B981" /> : <Text style={{ width: 24 }} />}
          </View>
        ))}
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
  hero: { borderRadius: 16, padding: 18, marginBottom: 16 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '900', marginLeft: 4 },
  heroSub: { marginTop: 10, fontSize: 14, fontWeight: '800' },
  bar: { height: 8, borderRadius: 999, backgroundColor: '#00000022', overflow: 'hidden', marginTop: 12 },
  barFill: { height: 8, borderRadius: 999 },
  heroMeta: { marginTop: 10, fontSize: 13, fontWeight: '800' },
  milestoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00000022',
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  milestoneTitle: { fontSize: 16, fontWeight: '900' },
  milestoneDesc: { marginTop: 4, fontSize: 13, fontWeight: '700' },
});

