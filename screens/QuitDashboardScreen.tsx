import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { QuitProfile, HealthMilestone } from '../lib/types';
import { getQuitProfile, getCravingLogs } from '../lib/storage';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import SkeletonBlock from '../components/ui/Skeleton';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';

const { width } = Dimensions.get('window');

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

export default function QuitDashboardScreen() {
  const [profile, setProfile] = useState<QuitProfile | null>(null);
  const [cravingsToday, setCravingsToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<any>();
  const { tokens } = useTheme();
  const c = tokens.colors;
  const streakScale = useSharedValue(1);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    const quitProfile = await getQuitProfile();
    setProfile(quitProfile);

    const logs = await getCravingLogs();
    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(log => log.timestamp.startsWith(today));
    setCravingsToday(todayLogs.length);
    setLoading(false);
  };

  const startDate = profile ? new Date(profile.startDate) : new Date();
  const now = new Date();
  const diffTime = now.getTime() - startDate.getTime();
  const elapsedDays = diffTime / (1000 * 60 * 60 * 24);
  const diffDays = Math.floor(elapsedDays);
  const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
  const diffSeconds = Math.floor((diffTime % (1000 * 60)) / 1000);

  const avoidedUnits = diffDays * (profile?.dailyAmount ?? 0);
  const savedMoney =
    profile
      ? (avoidedUnits / (profile.quitType === 'smoking' ? 20 : 1)) * profile.costPerUnit
      : 0;

  const nextMilestone = healthMilestones.find(m => diffDays < m.days);

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  const animatedStreakStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakScale.value }],
  }));

  const quitRisk = useMemo(() => {
    const base = 50;
    const cravingPenalty = Math.min(30, cravingsToday * 6);
    const firstWeekPenalty = diffDays < 7 ? 20 : 0;
    const settledBonus = diffDays > 30 ? 15 : 0;
    const score = Math.max(0, Math.min(100, base + cravingPenalty + firstWeekPenalty - settledBonus));
    return {
      score,
      label: score >= 70 ? 'High Risk Window' : score >= 45 ? 'Medium Risk' : 'Stable',
      color: score >= 70 ? c.danger : score >= 45 ? c.accent : c.success,
    };
  }, [cravingsToday, diffDays, c.danger, c.accent, c.success]);

  const phaseMessage = useMemo(() => {
    if (diffDays <= 3) return 'Acute withdrawal often peaks around day 3. Keep actions tiny and frequent.';
    if (diffDays <= 14) return 'First 2 weeks are the hardest. Cravings come in waves - usually short-lived.';
    if (diffDays <= 30) return 'You are in stabilization mode. Focus on routines and sleep quality.';
    return 'Recovery momentum is building. Protect your system and keep your identity strong.';
  }, [diffDays]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.setupContainer}>
            <SkeletonBlock height={68} width={68} radius={34} />
            <SkeletonBlock height={18} width={220} radius={10} style={{ marginTop: 16 }} />
            <SkeletonBlock height={14} width={260} radius={10} style={{ marginTop: 10 }} />
            <SkeletonBlock height={48} width={220} radius={24} style={{ marginTop: 22 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.setupContainer}>
          <Ionicons name="leaf-outline" size={60} color="#0D9488" />
          <Text style={[styles.setupTitle, { color: c.text }]}>
            Set Up Quit & Transform
          </Text>
          <Text style={[styles.setupDesc, { color: c.mutedText }]}>
            Configure your quit journey to start tracking your progress.
          </Text>
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: '#0D9488' }]}
            onPress={() => navigation.navigate('QuitOnboarding')}
            activeOpacity={0.85}
          >
            <Text style={styles.setupButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Quit & Transform</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.trackerButton, { borderColor: c.accent }]}
              onPress={() => navigation.navigate('Tracker')}
              activeOpacity={0.85}
            >
              <Ionicons name="albums" size={16} color={c.accent} />
              <Text style={[styles.trackerButtonText, { color: c.accent }]}>Professional Tracker</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('QuitSettings')}
              activeOpacity={0.85}
            >
              <Ionicons name="settings-outline" size={24} color={c.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Streak Counter */}
        <View style={styles.streakContainer}>
          <Animated.View style={[styles.streakNumber, animatedStreakStyle]}>
            <Text style={[styles.streakText, { color: '#0D9488' }]}>{diffDays}</Text>
          </Animated.View>
          <Text style={[styles.streakLabel, { color: c.mutedText }]}>Days Smoke-Free</Text>
          <Text style={[styles.timeCounter, { color: c.mutedText }]}>
            {formatTime(diffHours)}:{formatTime(diffMinutes)}:{formatTime(diffSeconds)}
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: c.surface }]}>
            <Ionicons name="cash" size={24} color="#F97316" />
            <Text style={[styles.statNumber, { color: '#F97316' }]}>
              {profile.currency}{savedMoney.toFixed(2)}
            </Text>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>Money Saved</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: c.surface }]}>
            <Ionicons name={profile.quitType === 'smoking' ? 'flame' : 'cloud'} size={24} color={c.danger} />
            <Text style={[styles.statNumber, { color: c.danger }]}>{avoidedUnits.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>
              {profile.quitType === 'smoking' ? 'Cigarettes' : 'Puffs'} Avoided
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: c.surface }]}>
            <Ionicons name="thermometer" size={24} color={c.info} />
            <Text style={[styles.statNumber, { color: c.info }]}>{cravingsToday}</Text>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>Cravings Today</Text>
          </View>
        </View>

        {/* Next Milestone */}
        {nextMilestone && (
          <View style={[styles.milestoneCard, { backgroundColor: c.surface }]}>
            <View style={styles.milestoneHeader}>
              <Ionicons name={nextMilestone.icon as any} size={24} color="#0D9488" />
              <Text style={[styles.milestoneTitle, { color: c.text }]}>
                Next: {nextMilestone.title}
              </Text>
            </View>
            <Text style={[styles.milestoneDesc, { color: c.mutedText }]}>
              {nextMilestone.description}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.max(0, (elapsedDays / nextMilestone.days) * 100))}%`,
                    backgroundColor: '#0D9488',
                  },
                ]}
              />
            </View>
          </View>
        )}

        <Card style={{ padding: 16, marginBottom: 18 }}>
          <View style={styles.riskRow}>
            <View>
              <Text style={[styles.riskTitle, { color: c.text }]}>{quitRisk.label}</Text>
              <Text style={[styles.riskDesc, { color: c.mutedText }]}>Risk score: {quitRisk.score}/100</Text>
            </View>
            <View style={[styles.riskPill, { backgroundColor: quitRisk.color }]}>
              <Text style={styles.riskPillText}>
                {quitRisk.score >= 70 ? 'Rescue Mode' : quitRisk.score >= 45 ? 'Stay Sharp' : 'On Track'}
              </Text>
            </View>
          </View>
          <Text style={[styles.phaseText, { color: c.mutedText }]}>{phaseMessage}</Text>
        </Card>

        <SectionHeader title="Rescue Toolkit" subtitle="Evidence-based coping actions" style={{ marginBottom: 10 }} />
        <View style={styles.toolkitGrid}>
          <Card style={[styles.toolkitCard, { marginRight: 10 }]}>
            <Text style={[styles.toolkitTitle, { color: c.text }]}>Urge Surf (90s)</Text>
            <Text style={[styles.toolkitDesc, { color: c.mutedText }]}>Name the craving, breathe 4-7-8, delay action 90 seconds.</Text>
          </Card>
          <Card style={styles.toolkitCard}>
            <Text style={[styles.toolkitTitle, { color: c.text }]}>Trigger Break</Text>
            <Text style={[styles.toolkitDesc, { color: c.mutedText }]}>Change location, drink water, walk for 2 minutes immediately.</Text>
          </Card>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: c.danger }]}
            onPress={() => navigation.navigate('CravingsLog')}
            activeOpacity={0.85}
          >
            <Ionicons name="thermometer" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.actionText}>Log Craving</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: c.success }, { marginLeft: 10 }]}
            onPress={() => navigation.navigate('Savings')}
            activeOpacity={0.85}
          >
            <Ionicons name="cash" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.actionText}>Savings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: c.info }, { marginLeft: 10 }]}
            onPress={() => navigation.navigate('HealthTimeline')}
            activeOpacity={0.85}
          >
            <Ionicons name="heart" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.actionText}>Health</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.dietButton, { backgroundColor: c.primary }]}
          onPress={() => navigation.navigate('DietTracker')}
          activeOpacity={0.85}
        >
          <Ionicons name="restaurant" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.dietButtonText}>Diet Tracker & Calorie Calculator</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  setupContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  setupDesc: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  setupButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackerButton: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackerButtonText: {
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  streakNumber: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(13, 148, 136, 0.1)',
  },
  streakText: {
    fontSize: 52,
    fontWeight: 'bold',
  },
  streakLabel: {
    fontSize: 18,
    marginTop: 10,
  },
  timeCounter: {
    fontSize: 14,
    marginTop: 5,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    width: (width - 50) / 3,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  milestoneCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  milestoneDesc: {
    fontSize: 14,
    marginBottom: 15,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#eee',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 12,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  riskRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  riskDesc: {
    fontSize: 12,
    marginTop: 4,
  },
  riskPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  riskPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  phaseText: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  toolkitGrid: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  toolkitCard: {
    flex: 1,
    padding: 14,
  },
  toolkitTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  toolkitDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  dietButton: {
    marginTop: 4,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  dietButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});