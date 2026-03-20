import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { getHabits } from '../lib/storage';
import { getActivityData, getSleepData, ActivityData, SleepData } from '../lib/sensorTracking';
import { Habit } from '../lib/types';
import { LineChart, BarChart } from 'react-native-chart-kit';
import SkeletonBlock from '../components/ui/Skeleton';
import Card from '../components/ui/Card';
import GradientFill from '../components/ui/GradientFill';
import ProgressBar from '../components/ui/ProgressBar';
import { inspirationalFacts } from '../lib/inspirationalFacts';

export default function StatsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [sleepData, setSleepData] = useState<SleepData[]>([]);
  const { tokens } = useTheme();
  const navigation = useNavigation<any>();
  const c = tokens.colors;
  const [loading, setLoading] = useState(true);
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(280, screenWidth - 40);
  const cardWidth = screenWidth < 390 ? '100%' : (screenWidth - 40 - 12) / 2;

  const dailyFact = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const idx = dayOfYear % Math.max(1, inspirationalFacts.length);
    return inspirationalFacts[idx];
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const loadedHabits = await getHabits();
    const activities = await getActivityData();
    const sleeps = await getSleepData();
    setHabits(loadedHabits);
    setActivityData(activities);
    setSleepData(sleeps);
    setLoading(false);
  };

  const totalDays = habits.reduce((sum, habit) => sum + habit.completedDates.length, 0);
  const totalStreaks = habits.reduce((sum, habit) => sum + habit.longestStreak, 0);
  const averageStreak = habits.length > 0 ? totalStreaks / habits.length : 0;
  const activeHabits = habits.filter(h => h.currentStreak > 0).length;

  const totalSteps = activityData.reduce((sum, day) => sum + day.steps, 0);
  // Average sleep per calendar day (prevents skew when multiple sleep entries exist in one day)
  const sleepByDay = new Map<string, SleepData>();
  for (const s of sleepData) {
    const key = new Date(s.startTime).toISOString().split('T')[0];
    const prev = sleepByDay.get(key);
    if (!prev || s.startTime > prev.startTime) sleepByDay.set(key, s);
  }
  const averageSleep =
    sleepByDay.size > 0
      ? Array.from(sleepByDay.values()).reduce((sum, s) => sum + s.duration, 0) / sleepByDay.size / 60
      : 0;
  const totalCalories = activityData.reduce((sum, day) => sum + day.calories, 0);

  const xpPerLevel = 25;
  const level = Math.floor(totalDays / xpPerLevel) + 1;
  const xpIntoLevel = totalDays % xpPerLevel;
  const xpToNext = xpPerLevel - xpIntoLevel;

  const generateMonthlyData = () => {
    const labels = [];
    const data = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(date.toLocaleDateString('en-US', { month: 'short' }));

      let monthTotal = 0;
      habits.forEach(habit => {
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const monthCompletions = habit.completedDates.filter(d => {
          const dateObj = new Date(d);
          return dateObj >= monthStart && dateObj <= monthEnd;
        });
        monthTotal += monthCompletions.length;
      });
      data.push(monthTotal);
    }

    return { labels, datasets: [{ data }] };
  };

  const generateWeekdayData = () => {
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [0, 0, 0, 0, 0, 0, 0];

    habits.forEach(habit => {
      habit.completedDates.forEach(date => {
        const dayOfWeek = new Date(date).getDay();
        data[dayOfWeek]++;
      });
    });

    return { labels: weekdays, datasets: [{ data }] };
  };

  const generateActivityData = () => {
    const now = new Date();
    const activityByDate = new Map(activityData.map((a) => [a.date, a]));
    const labels: string[] = [];
    const stepsData: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const entry = activityByDate.get(key);
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      stepsData.push(entry?.steps ?? 0);
    }

    return { labels, datasets: [{ data: stepsData }] };
  };

  const generateSleepData = () => {
    const now = new Date();
    const sleepByDate = new Map<string, SleepData>();

    for (const s of sleepData) {
      const d = new Date(s.startTime);
      const key = d.toISOString().split('T')[0];
      const prev = sleepByDate.get(key);
      if (!prev || s.startTime > prev.startTime) sleepByDate.set(key, s);
    }

    const labels: string[] = [];
    const durationData: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const entry = sleepByDate.get(key);
      labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
      durationData.push(entry ? entry.duration / 60 : 0); // Convert minutes -> hours
    }

    return { labels, datasets: [{ data: durationData }] };
  };

  const monthlyData = generateMonthlyData();
  const weekdayData = generateWeekdayData();
  const activityChartData = generateActivityData();
  const sleepChartData = generateSleepData();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sportHeader}>
          <GradientFill colors={[c.primary, c.accent]} style={StyleSheet.absoluteFillObject} opacity={0.85} />
          <View style={styles.sportHeaderInner}>
            <Ionicons name="bar-chart" size={22} color="#fff" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sportHeaderTitle}>Training Stats</Text>
              <Text style={styles.sportHeaderSub}>Consistency, recovery, and momentum</Text>
              {!loading ? (
                <View style={{ marginTop: 10 }}>
                  <ProgressBar value={xpIntoLevel / xpPerLevel} height={10} label={`Level ${level}`} />
                  <Text style={styles.sportXpSub}>
                    Next level in {Math.max(0, xpToNext)} habit days
                  </Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.headerDietBtn}
              onPress={() => navigation.navigate('DietTracker')}
              activeOpacity={0.85}
            >
              <Ionicons name="restaurant" size={16} color="#fff" />
              <Text style={styles.headerDietText}>Diet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: c.surface, width: cardWidth }]}>
                <SkeletonBlock height={22} width={80} radius={10} />
                <SkeletonBlock height={14} width={120} radius={10} style={{ marginTop: 12 }} />
              </View>
              <View style={[styles.statCard, { backgroundColor: c.surface, width: cardWidth }]}>
                <SkeletonBlock height={22} width={120} radius={10} />
                <SkeletonBlock height={14} width={120} radius={10} style={{ marginTop: 12 }} />
              </View>
              <View style={[styles.statCard, { backgroundColor: c.surface, width: cardWidth }]}>
                <SkeletonBlock height={22} width={120} radius={10} />
                <SkeletonBlock height={14} width={120} radius={10} style={{ marginTop: 12 }} />
              </View>
              <View style={[styles.statCard, { backgroundColor: c.surface, width: cardWidth }]}>
                <SkeletonBlock height={22} width={120} radius={10} />
                <SkeletonBlock height={14} width={120} radius={10} style={{ marginTop: 12 }} />
              </View>
            </View>

            <View style={styles.chartContainer}>
              <SkeletonBlock height={220} width={chartWidth} radius={16} />
            </View>
            <View style={styles.chartContainer}>
              <SkeletonBlock height={220} width={chartWidth} radius={16} />
            </View>
          </View>
        ) : null}

        {!loading ? <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: c.surface, width: cardWidth }]}>
            <Ionicons name="calendar" size={24} color={c.primary} />
            <Text style={[styles.statNumber, { color: c.primary }]}>{totalDays}</Text>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>Habit Days</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.surface, width: cardWidth }]}>
            <Ionicons name="walk" size={24} color={c.success} />
            <Text style={[styles.statNumber, { color: c.success }]}>{totalSteps.toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>Total Steps</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.surface, width: cardWidth }]}>
            <Ionicons name="moon" size={24} color={c.info} />
            <Text style={[styles.statNumber, { color: c.info }]}>{averageSleep.toFixed(1)}h</Text>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>Avg Sleep</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: c.surface, width: cardWidth }]}>
            <Ionicons name="flame" size={24} color={c.danger} />
            <Text style={[styles.statNumber, { color: c.danger }]}>
              {Math.round(totalCalories).toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>Energy (kcal)</Text>
          </View>
        </View> : null}

        {!loading ? (
          <>
            <View style={styles.secondaryGrid}>
              <Card style={[styles.factCard, { width: cardWidth }]}>
                <View style={styles.factHeader}>
                  <Ionicons name="bulb" size={18} color={c.accent} />
                  <Text style={[styles.factTitle, { color: c.text }]}>Daily Fact</Text>
                </View>
                <Text style={[styles.factCategory, { color: c.mutedText }]}>{dailyFact.category}</Text>
                <Text style={[styles.factText, { color: c.text }]}>{dailyFact.text}</Text>
              </Card>

              <Card style={[styles.improveCard, { width: cardWidth }]}>
                <View style={styles.factHeader}>
                  <Ionicons name="flame" size={18} color={c.primary} />
                  <Text style={[styles.factTitle, { color: c.text }]}>Improve Yourself</Text>
                </View>

                {(() => {
                  const now = new Date();
                  const rated = habits.map((h) => {
                    const start = new Date(h.startDate);
                    const daysSinceStart = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                    const completionRate = h.completedDates.length / daysSinceStart;
                    return { habit: h, daysSinceStart, completionRate };
                  });

                  const worst = rated.sort((a, b) => a.completionRate - b.completionRate)[0];
                  const best = rated.sort((a, b) => b.completionRate - a.completionRate)[0];
                  const activeCount = habits.filter((h) => h.currentStreak > 0).length;

                  if (!worst) return null;

                  const warmupHabit = activeCount === 0 ? best.habit : worst.habit;
                  const warmupLabel = warmupHabit?.name ?? 'your habit';

                  return (
                    <View style={styles.improveSteps}>
                      <View style={[styles.improveStep, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
                        <Text style={[styles.improveStepTitle, { color: c.text }]}>Warm-up (2 minutes)</Text>
                        <Text style={[styles.improveStepText, { color: c.mutedText }]}>
                          Set up and start {warmupLabel}. The goal is to begin, not to perfect.
                        </Text>
                      </View>
                      <View style={[styles.improveStep, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
                        <Text style={[styles.improveStepTitle, { color: c.text }]}>Main set</Text>
                        <Text style={[styles.improveStepText, { color: c.mutedText }]}>
                          Do the habit at the same time today. Consistency beats intensity.
                        </Text>
                      </View>
                      <View style={[styles.improveStep, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
                        <Text style={[styles.improveStepTitle, { color: c.text }]}>Streak defense</Text>
                        <Text style={[styles.improveStepText, { color: c.mutedText }]}>
                          If you miss, immediately switch to a tiny version tomorrow and log it.
                        </Text>
                      </View>
                    </View>
                  );
                })()}
              </Card>
            </View>
          </>
        ) : null}

        {!loading && monthlyData.labels.length > 1 && (
          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: c.text }]}>Monthly Activity</Text>
            <LineChart
              data={monthlyData}
              width={chartWidth}
              height={220}
              chartConfig={{
                backgroundColor: c.surface,
                backgroundGradientFrom: c.surface,
                backgroundGradientTo: c.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => c.primary,
                labelColor: (opacity = 1) => c.text,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: c.primary,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {!loading && activityChartData.labels.length > 1 && (
          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: c.text }]}>Daily Steps (Last 7 Days)</Text>
            <BarChart
              data={activityChartData}
              width={chartWidth}
              height={220}
              chartConfig={{
                backgroundColor: c.surface,
                backgroundGradientFrom: c.surface,
                backgroundGradientTo: c.surface,
                decimalPlaces: 0,
                color: (opacity = 1) => c.success,
                labelColor: (opacity = 1) => c.text,
                style: {
                  borderRadius: 16,
                },
              }}
              style={styles.chart}
              yAxisLabel=""
              yAxisSuffix=""
            />
          </View>
        )}

        {!loading && sleepChartData.labels.length > 1 && (
          <View style={styles.chartContainer}>
            <Text style={[styles.chartTitle, { color: c.text }]}>Sleep Duration (Last 7 Days)</Text>
            <LineChart
              data={sleepChartData}
              width={chartWidth}
              height={220}
              chartConfig={{
                backgroundColor: c.surface,
                backgroundGradientFrom: c.surface,
                backgroundGradientTo: c.surface,
                decimalPlaces: 1,
                color: (opacity = 1) => c.info,
                labelColor: (opacity = 1) => c.text,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: c.info,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {!loading ? (
          <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, { color: c.text }]}>Activity by Weekday</Text>
          <BarChart
            data={weekdayData}
            width={chartWidth}
            height={220}
            chartConfig={{
              backgroundColor: c.surface,
              backgroundGradientFrom: c.surface,
              backgroundGradientTo: c.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => c.success,
              labelColor: (opacity = 1) => c.text,
              style: {
                borderRadius: 16,
              },
            }}
            style={styles.chart}
          yAxisLabel=""
          yAxisSuffix=""
          />
        </View>
        ) : null}

        {!loading ? (
          <View style={styles.habitsList}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Habit Breakdown</Text>
          {habits.map((habit) => (
            <View key={habit.id} style={[styles.habitItem, { backgroundColor: c.surface }]}>
              <View style={styles.habitLeft}>
                <View style={[styles.iconContainer, { backgroundColor: habit.color }]}>
                  <Ionicons name={habit.icon as any} size={20} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.habitName, { color: c.text }]}>{habit.name}</Text>
                  <Text style={[styles.habitStats, { color: c.mutedText }]}>
                    {habit.completedDates.length} days • Best streak: {habit.longestStreak}
                  </Text>
                </View>
              </View>
              <Text style={[styles.habitStreak, { color: habit.color }]}>{habit.currentStreak}</Text>
            </View>
          ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  sportHeader: {
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#00000010',
  },
  sportHeaderInner: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  headerDietBtn: {
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerDietText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  sportHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  sportHeaderSub: {
    color: '#FFFFFFCC',
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  sportXpSub: {
    marginTop: 6,
    color: '#FFFFFFCC',
    fontSize: 12,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  statCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  statLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  chartContainer: {
    marginBottom: 30,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  chart: {
    borderRadius: 16,
  },
  habitsList: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  secondaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  factCard: {
    padding: 16,
    marginBottom: 10,
  },
  improveCard: {
    padding: 16,
    marginBottom: 10,
  },
  factHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  factTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginLeft: 8,
  },
  factCategory: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: -2,
  },
  factText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  improveSteps: {
    marginTop: 8,
  },
  improveStep: {
    borderWidth: 1,
    borderColor: '#00000022',
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  improveStepTitle: {
    fontSize: 14,
    fontWeight: '900',
  },
  improveStepText: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  habitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
  },
  habitStats: {
    fontSize: 14,
  },
  habitStreak: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});