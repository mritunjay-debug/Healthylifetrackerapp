import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getHabits, saveHabits, getUserStats, saveUserStats, getAchievements, saveAchievements, getDailyChallenges, saveDailyChallenges } from '../lib/storage';
import { Habit, UserStats, Achievement, DailyChallenge, achievements } from '../lib/types';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import SensorTracker from '../components/SensorTracker';
import Card from '../components/ui/Card';
import SectionHeader from '../components/ui/SectionHeader';
import ProgressBar from '../components/ui/ProgressBar';
import GradientFill from '../components/ui/GradientFill';
import { trackEvent } from '../lib/telemetry';

const motivationalQuotes = [
  "You're building something incredible!",
  "Every day is a new link in your chain.",
  "Consistency is your superpower.",
  "Small wins add up to big victories.",
];

type PlanAction = {
  habit: Habit;
  riskScore: number;
  riskLabel: 'High' | 'Medium' | 'Low';
  reason: string;
  estimatedMinutes: number;
};

export default function HomeScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [longestStreak, setLongestStreak] = useState(0);
  const navigation = useNavigation<any>();
  const { isDark, tokens } = useTheme();
  const c = tokens.colors;
  const streakScale = useSharedValue(1);

  useEffect(() => {
    loadData();
    generateDailyChallenges();
  }, []);

  useEffect(() => {
    trackEvent('screen_view', {
      screen_name: 'Home',
      previous_screen_name: null,
    });
  }, []);

  const loadData = async () => {
    const loadedHabits = await getHabits();
    const stats = await getUserStats();
    const challenges = await getDailyChallenges();
    setHabits(loadedHabits);
    setUserStats(stats);
    setDailyChallenges(challenges);
    const maxStreak = Math.max(...loadedHabits.map(h => h.longestStreak), 0);
    setLongestStreak(maxStreak);
  };

  const generateDailyChallenges = async () => {
    const today = new Date().toISOString().split('T')[0];
    const existing = await getDailyChallenges();
    const todayChallenges = existing.filter(c => c.date === today);

    if (todayChallenges.length === 0) {
      // Generate 3 random challenges
      const challengeTypes: DailyChallenge['type'][] = ['streak', 'completion', 'variety', 'consistency'];
      const challengeTitles = {
        streak: 'Maintain all current streaks',
        completion: 'Complete 80% of active habits',
        variety: 'Try a new habit category',
        consistency: 'Check in before 9 AM',
      };
      const challengeDescriptions = {
        streak: 'Keep your momentum going!',
        completion: 'Stay consistent today.',
        variety: 'Explore new habits.',
        consistency: 'Start your day right.',
      };

      const newChallenges: DailyChallenge[] = [];
      for (let i = 0; i < 3; i++) {
        const type = challengeTypes[Math.floor(Math.random() * challengeTypes.length)];
        newChallenges.push({
          id: `challenge-${today}-${i}`,
          title: challengeTitles[type],
          description: challengeDescriptions[type],
          icon: type === 'streak' ? 'flame' : type === 'completion' ? 'checkmark-circle' : 'bulb',
          color: type === 'streak' ? '#EF4444' : type === 'completion' ? '#10B981' : '#F97316',
          completed: false,
          points: 25,
          date: today,
          type,
        });
      }
      await saveDailyChallenges([...existing, ...newChallenges]);
      setDailyChallenges([...existing, ...newChallenges]);
    }
  };

  const toggleHabit = async (habit: Habit) => {
    const today = new Date().toISOString().split('T')[0];
    const isCompleted = habit.completedDates.includes(today);
    const newCompletedDates = isCompleted
      ? habit.completedDates.filter(d => d !== today)
      : [...habit.completedDates, today];

    const updatedHabit = { ...habit, completedDates: newCompletedDates };
    // Recalculate streaks
    const sortedDates = newCompletedDates.sort();
    let currentStreak = 0;
    let longestStreak = updatedHabit.longestStreak;

    // Calculate current streak
    const todayDate = new Date(today);
    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date(todayDate);
      checkDate.setDate(checkDate.getDate() - i);
      const checkStr = checkDate.toISOString().split('T')[0];
      if (sortedDates.includes(checkStr)) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Update longest if needed
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    updatedHabit.currentStreak = currentStreak;
    updatedHabit.longestStreak = longestStreak;

    const updatedHabits = habits.map(h => h.id === habit.id ? updatedHabit : h);
    setHabits(updatedHabits);
    await saveHabits(updatedHabits);
    await trackEvent(isCompleted ? 'habit_missed' : 'habit_completed', {
      habit_id: habit.id,
      completion_type: 'full',
      current_streak: updatedHabit.currentStreak,
    });

    // Award points and check achievements if completing
    if (!isCompleted && userStats) {
      const newStats = { ...userStats };
      newStats.totalPoints += 10;
      newStats.experience += 10;

      // Level up logic
      while (newStats.experience >= newStats.experienceToNext) {
        newStats.experience -= newStats.experienceToNext;
        newStats.level += 1;
        newStats.experienceToNext = newStats.level * 100;
      }

      // Update stats
      newStats.longestStreakEver = Math.max(newStats.longestStreakEver, longestStreak);
      newStats.totalHabitsCompleted += 1;
      newStats.currentActiveHabits = updatedHabits.filter(h => h.isActive).length;

      setUserStats(newStats);
      await saveUserStats(newStats);

      // Check achievements
      await checkAchievements(updatedHabits, newStats);

      // Check daily challenges
      await checkDailyChallenges(updatedHabits);
    }

    if (!isCompleted) {
      streakScale.value = withSpring(1.2, {}, () => {
        streakScale.value = withSpring(1);
      });
    }
  };

  const completeFallback = async (habit: Habit) => {
    const today = new Date().toISOString().split('T')[0];
    const isCompleted = habit.completedDates.includes(today);
    if (isCompleted) return;

    const newCompletedDates = [...habit.completedDates, today];
    const sortedDates = [...newCompletedDates].sort();
    let currentStreak = 0;
    let longestStreak = habit.longestStreak;
    const todayDate = new Date(today);

    for (let i = 0; i <= 365; i++) {
      const checkDate = new Date(todayDate);
      checkDate.setDate(checkDate.getDate() - i);
      const checkStr = checkDate.toISOString().split('T')[0];
      if (sortedDates.includes(checkStr)) currentStreak++;
      else break;
    }
    if (currentStreak > longestStreak) longestStreak = currentStreak;

    const updatedHabit: Habit = {
      ...habit,
      completedDates: newCompletedDates,
      currentStreak,
      longestStreak,
      notes: [...habit.notes, `${today}: fallback completed (${habit.fallbackAction || '2-minute version'})`],
    };

    const updatedHabits = habits.map((h) => (h.id === habit.id ? updatedHabit : h));
    setHabits(updatedHabits);
    await saveHabits(updatedHabits);
    await trackEvent('streak_saved', {
      habit_id: habit.id,
      rescue_type_used: '2_min_fallback',
      previous_streak_length: habit.currentStreak,
    });
  };

  const checkAchievements = async (habits: Habit[], stats: UserStats) => {
    const currentAchievements = await getAchievements();
    const allAchievements = achievements.map(a => {
      const existing = currentAchievements.find(ca => ca.id === a.id);
      return existing || { ...a };
    });

    let hasNewAchievement = false;
    for (const achievement of allAchievements) {
      if (!achievement.unlocked && achievement.condition(habits, stats)) {
        achievement.unlocked = true;
        achievement.unlockedDate = new Date().toISOString();
        stats.totalPoints += achievement.points;
        hasNewAchievement = true;
      }
    }

    if (hasNewAchievement) {
      await saveAchievements(allAchievements);
      Alert.alert('Achievement Unlocked!', 'Check your achievements for details.');
    }
  };

  const checkDailyChallenges = async (habits: Habit[]) => {
    const today = new Date().toISOString().split('T')[0];
    const challenges = await getDailyChallenges();
    const todayChallenges = challenges.filter(c => c.date === today);

    for (const challenge of todayChallenges) {
      if (!challenge.completed) {
        let completed = false;
        switch (challenge.type) {
          case 'completion':
            const activeHabits = habits.filter(h => h.isActive);
            const completedHabits = activeHabits.filter(h =>
              h.completedDates.includes(today)
            );
            completed = completedHabits.length / activeHabits.length >= 0.8;
            break;
          case 'streak':
            completed = habits.every(h =>
              h.completedDates.includes(today) || h.currentStreak === 0
            );
            break;
          // Add more challenge types as needed
        }

        if (completed && userStats) {
          challenge.completed = true;
          userStats.totalPoints += challenge.points;
          setUserStats(userStats);
          await saveUserStats(userStats);
        }
      }
    }

    await saveDailyChallenges(challenges);
    setDailyChallenges(challenges);
  };

  const activeHabits = habits.filter(h => h.currentStreak > 0 || h.completedDates.length > 0);
  const totalStreaks = habits.reduce((sum, h) => sum + h.longestStreak, 0);
  const today = new Date().toISOString().split('T')[0];

  const topPlanActions = useMemo<PlanAction[]>(() => {
    const now = new Date();
    const recentDays = 14;
    const previousDay = new Date(now);
    previousDay.setDate(previousDay.getDate() - 1);
    const prevStr = previousDay.toISOString().split('T')[0];

    const actions = habits
      .filter((h) => h.isActive)
      .filter((h) => !h.completedDates.includes(today))
      .map((habit) => {
        const recentCompleted = habit.completedDates.filter((d) => {
          const dt = new Date(d);
          const diff = (now.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff <= recentDays;
        }).length;
        const completionRate = recentCompleted / recentDays;
        const missedYesterday = !habit.completedDates.includes(prevStr);

        // Higher score = more urgent to include in today's Top 3.
        let riskScore = 40;
        if (habit.currentStreak > 0) riskScore += 25;
        if (missedYesterday) riskScore += 20;
        riskScore += Math.round((1 - completionRate) * 30);

        const riskLabel: PlanAction['riskLabel'] =
          riskScore >= 80 ? 'High' : riskScore >= 60 ? 'Medium' : 'Low';

        const reason =
          habit.currentStreak > 0
            ? 'Protect your active streak'
            : completionRate < 0.35
            ? 'Rebuild consistency in this habit'
            : 'Maintain momentum today';

        const estimatedMinutes =
          habit.targetDays >= 30 ? 20 : habit.targetDays >= 14 ? 12 : 8;

        return { habit, riskScore, riskLabel, reason, estimatedMinutes };
      })
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 3);

    return actions;
  }, [habits, today]);

  const animatedStreakStyle = useAnimatedStyle(() => ({
    transform: [{ scale: streakScale.value }],
  }));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: c.text }]}>Good morning!</Text>
            {userStats && (
              <Text style={[styles.levelText, { color: c.mutedText }]}>
                Level {userStats.level} • {userStats.totalPoints} points
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.quickTrackerButton, { borderColor: c.accent }]}
              onPress={() => navigation.navigate('Tracker')}
              activeOpacity={0.85}
            >
              <Ionicons name="albums" size={16} color={c.accent} />
              <Text style={[styles.quickTrackerText, { color: c.accent }]}>Tracker</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickDietButton, { borderColor: c.primary }]}
              onPress={() => navigation.navigate('DietTracker')}
              activeOpacity={0.85}
            >
              <Ionicons name="restaurant" size={16} color={c.primary} />
              <Text style={[styles.quickDietText, { color: c.primary }]}>Diet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.85}
            >
              <Ionicons name="settings-outline" size={24} color={c.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.streakContainer}>
          <Animated.View style={[styles.streakNumber, animatedStreakStyle]}>
            <GradientFill colors={[c.accent, c.primary]} style={StyleSheet.absoluteFillObject} opacity={0.95} />
            <Text style={[styles.streakText, { color: c.accent }]}>
              {longestStreak}
            </Text>
          </Animated.View>
          <Text style={[styles.streakLabel, { color: c.mutedText }]}>Longest Streak</Text>
        </View>

        {userStats && (
          <Card style={{ marginBottom: 20, padding: 14, backgroundColor: 'transparent', overflow: 'hidden' }}>
            <GradientFill colors={[c.primary, c.accent]} style={StyleSheet.absoluteFillObject} opacity={0.9} />
            <ProgressBar
              value={userStats.experienceToNext > 0 ? userStats.experience / userStats.experienceToNext : 0}
              label={`${userStats.experience}/${userStats.experienceToNext} XP to Level ${userStats.level + 1}`}
              height={12}
            />
          </Card>
        )}

        <SensorTracker onDataUpdate={loadData} />

        <Text style={[styles.quote, { color: c.mutedText }]}>
          {motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]}
        </Text>

        <View style={styles.planContainer}>
          <SectionHeader
            title="Adaptive Daily Plan"
            subtitle="Top 3 actions picked from risk + consistency"
            style={{ marginBottom: 14 }}
          />
          {topPlanActions.length === 0 ? (
            <Card style={[styles.planEmptyCard, { backgroundColor: c.surface }]}>
              <Text style={[styles.planEmptyText, { color: c.mutedText }]}>
                All active habits are completed for today. Great execution.
              </Text>
            </Card>
          ) : (
            topPlanActions.map((item) => (
              <Card key={item.habit.id} style={[styles.planCard, { backgroundColor: c.surface }]}>
                <View style={styles.planTopRow}>
                  <View style={[styles.iconContainer, { backgroundColor: item.habit.color }]}>
                    <Ionicons name={item.habit.icon as any} size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planHabitName, { color: c.text }]}>{item.habit.name}</Text>
                    <Text style={[styles.planReason, { color: c.mutedText }]}>{item.reason}</Text>
                  </View>
                  <View
                    style={[
                      styles.riskBadge,
                      {
                        backgroundColor:
                          item.riskLabel === 'High'
                            ? c.danger
                            : item.riskLabel === 'Medium'
                            ? c.accent
                            : c.success,
                      },
                    ]}
                  >
                    <Text style={styles.riskBadgeText}>{item.riskLabel}</Text>
                  </View>
                </View>

                <View style={styles.planBottomRow}>
                  <Text style={[styles.planTime, { color: c.mutedText }]}>
                    Suggested: {item.estimatedMinutes} min
                  </Text>
                  <View style={styles.planActions}>
                    <TouchableOpacity
                      style={[styles.easierBtn, { borderColor: c.primary }]}
                      onPress={() => completeFallback(item.habit)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.easierBtnText, { color: c.primary }]}>Make it Easier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.startBtn, { backgroundColor: c.success }]}
                      onPress={() => toggleHabit(item.habit)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.startBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        {dailyChallenges.length > 0 && (
          <View style={styles.challengesContainer}>
            <SectionHeader title="Daily Challenges" style={{ marginBottom: 15 }} />
            {dailyChallenges.slice(0, 3).map((challenge) => (
              <View key={challenge.id} style={[styles.challengeItem, { backgroundColor: c.surface }]}>
                <View style={[styles.challengeIcon, { backgroundColor: challenge.color }]}>
                  <Ionicons name={challenge.icon as any} size={20} color="#fff" />
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={[styles.challengeTitle, { color: c.text }]}>{challenge.title}</Text>
                  <Text style={[styles.challengeDesc, { color: c.mutedText }]}>{challenge.description}</Text>
                </View>
                {challenge.completed && (
                  <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                )}
              </View>
            ))}
          </View>
        )}

        <View style={styles.habitsContainer}>
          <SectionHeader title="Today's Habits" style={{ marginBottom: 15 }} />
          {activeHabits.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="add-circle-outline" size={48} color={c.mutedText} />
              <Text style={[styles.emptyText, { color: c.mutedText }]}>
                No active habits yet. Add one below!
              </Text>
            </View>
          ) : (
            activeHabits.map((habit) => {
              const isCompleted = habit.completedDates.includes(new Date().toISOString().split('T')[0]);
              return (
                <TouchableOpacity
                  key={habit.id}
                  style={[styles.habitItem, { backgroundColor: c.surface }]}
                  onPress={() => navigation.navigate('HabitDetail', { habitId: habit.id })}
                  activeOpacity={0.85}
                >
                  <View style={styles.habitLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: habit.color }]}>
                      <Ionicons name={habit.icon as any} size={20} color="#fff" />
                    </View>
                    <View>
                      <Text style={[styles.habitName, { color: c.text }]}>{habit.name}</Text>
                      <Text style={[styles.habitStreak, { color: c.mutedText }]}>
                        Current: {habit.currentStreak} days
                      </Text>
                      {habit.implementationIntent ? (
                        <Text style={[styles.habitIntent, { color: c.mutedText }]} numberOfLines={1}>
                          {habit.implementationIntent}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                <View style={styles.habitActions}>
                  {!isCompleted && (
                    <TouchableOpacity
                      style={[styles.fallbackButton, { borderColor: c.primary }]}
                      onPress={() => completeFallback(habit)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.fallbackButtonText, { color: c.primary }]}>2m</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.checkButton, { backgroundColor: isCompleted ? c.success : c.border }]}
                    onPress={() => toggleHabit(habit)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: c.primary }]}>{totalStreaks}</Text>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>Total Streaks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: c.success }]}>{habits.length}</Text>
            <Text style={[styles.statLabel, { color: c.mutedText }]}>Habits</Text>
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Habits')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  levelText: {
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickDietButton: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  quickTrackerButton: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  quickDietText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  quickTrackerText: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 5,
  },
  settingsButton: {
    padding: 8,
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  streakNumber: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  streakText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  streakLabel: {
    fontSize: 16,
    marginTop: 10,
  },
  quote: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  progressBar: {
    height: 20,
    backgroundColor: '#eee',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  progressText: {
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    lineHeight: 20,
  },
  challengesContainer: {
    marginBottom: 30,
  },
  planContainer: {
    marginBottom: 28,
  },
  planCard: {
    padding: 14,
    marginBottom: 12,
  },
  planEmptyCard: {
    padding: 14,
  },
  planEmptyText: {
    fontSize: 14,
    fontWeight: '700',
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planBottomRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planHabitName: {
    fontSize: 15,
    fontWeight: '800',
  },
  planReason: {
    fontSize: 12,
    marginTop: 2,
  },
  riskBadge: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginLeft: 8,
  },
  riskBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  planTime: {
    fontSize: 12,
    fontWeight: '700',
  },
  planActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  easierBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 8,
  },
  easierBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  startBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  startBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  challengeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  challengeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  challengeDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  habitsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 10,
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
  habitStreak: {
    fontSize: 14,
  },
  habitIntent: {
    fontSize: 12,
    marginTop: 3,
    maxWidth: 190,
  },
  checkButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fallbackButton: {
    minWidth: 38,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginRight: 8,
    paddingHorizontal: 8,
  },
  fallbackButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});