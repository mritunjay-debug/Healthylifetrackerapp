import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getHabits, saveHabits } from '../lib/storage';
import { Habit, milestones } from '../lib/types';
import { LineChart } from 'react-native-chart-kit';
import SkeletonBlock from '../components/ui/Skeleton';

const { width } = Dimensions.get('window');

export default function HabitDetailScreen() {
  const [habit, setHabit] = useState<Habit | null>(null);
  const navigation = useNavigation();
  const route = useRoute();
  const { habitId } = route.params as { habitId: string };
  const { tokens, isDark } = useTheme();
  const c = tokens.colors;

  useEffect(() => {
    loadHabit();
  }, [habitId]);

  const loadHabit = async () => {
    const habits = await getHabits();
    const foundHabit = habits.find(h => h.id === habitId);
    setHabit(foundHabit || null);
  };

  if (!habit) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.loadingWrap}>
          <SkeletonBlock height={70} width={140} radius={18} style={{ marginBottom: 18 }} />
          <SkeletonBlock height={180} width={180} radius={90} style={{ marginBottom: 18 }} />
          <SkeletonBlock height={16} width={width - 60} radius={10} style={{ marginBottom: 10 }} />
          <SkeletonBlock height={16} width={width - 90} radius={10} style={{ marginBottom: 10 }} />
          <SkeletonBlock height={180} width={width - 40} radius={18} style={{ marginBottom: 10 }} />
        </View>
      </SafeAreaView>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  const isCompletedToday = habit.completedDates.includes(today);

  const calendarData = generateCalendarData(habit);
  const chartData = generateChartData(habit);
  const successRate = habit.completedDates.length > 0 ?
    (habit.longestStreak / Math.max(habit.completedDates.length, 1)) * 100 : 0;

  const unlockedMilestones = milestones.filter(m => habit.longestStreak >= m.days);

  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');

  const moodOptions = [
    { emoji: '😢', label: 'Terrible', value: 1 },
    { emoji: '😟', label: 'Bad', value: 2 },
    { emoji: '😐', label: 'Okay', value: 3 },
    { emoji: '🙂', label: 'Good', value: 4 },
    { emoji: '😊', label: 'Great', value: 5 },
  ];

  const toggleToday = async () => {
    const newCompletedDates = isCompletedToday
      ? habit.completedDates.filter(d => d !== today)
      : [...habit.completedDates, today];

    const updatedHabit = { ...habit, completedDates: newCompletedDates };
    // Recalculate streaks
    const sortedDates = newCompletedDates.sort();
    let currentStreak = 0;
    let longestStreak = updatedHabit.longestStreak;

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

    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }

    updatedHabit.currentStreak = currentStreak;
    updatedHabit.longestStreak = longestStreak;

    setHabit(updatedHabit);
    const habits = await getHabits();
    const updatedHabits = habits.map(h => h.id === habit.id ? updatedHabit : h);
    await saveHabits(updatedHabits);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]}>{habit.name}</Text>
          <TouchableOpacity>
            <Ionicons name="ellipsis-vertical" size={24} color={c.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.streakContainer}>
          <Text style={[styles.currentStreak, { color: habit.color }]}>{habit.currentStreak}</Text>
          <Text style={[styles.streakLabel, { color: c.mutedText }]}>Current Streak</Text>
          <Text style={[styles.longestStreak, { color: c.mutedText }]}>
            Longest: {habit.longestStreak} days
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.todayButton, { backgroundColor: isCompletedToday ? '#10B981' : '#ddd' }]}
          onPress={toggleToday}
        >
          <Text style={styles.todayButtonText}>
            {isCompletedToday ? 'Completed Today ✓' : 'Mark as Done'}
          </Text>
        </TouchableOpacity>

        <View style={styles.moodContainer}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>How are you feeling?</Text>
          <View style={styles.moodSelector}>
            {moodOptions.map((mood) => (
              <TouchableOpacity
                key={mood.value}
                style={[styles.moodOption, { backgroundColor: selectedMood === mood.value ? habit.color : c.surfaceElevated }]}
                onPress={() => setSelectedMood(mood.value)}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[styles.moodLabel, { color: selectedMood === mood.value ? '#fff' : c.mutedText }]}>
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.notesContainer}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Today's Note</Text>
          <TextInput
            style={[styles.noteInput, { color: c.text, backgroundColor: c.surfaceElevated }]}
            placeholder="Add a note about today..."
            placeholderTextColor={c.mutedText}
            value={noteText}
            onChangeText={setNoteText}
            multiline
            numberOfLines={3}
          />
          <TouchableOpacity style={[styles.saveNoteButton, { backgroundColor: habit.color }]}>
            <Text style={styles.saveNoteText}>Save Note</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.calendarContainer}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Activity Calendar</Text>
          <View style={styles.calendarGrid}>
            {calendarData.map((week, weekIndex) => (
              <View key={weekIndex} style={styles.weekRow}>
                {week.map((day, dayIndex) => (
                  <View
                    key={dayIndex}
                    style={[
                      styles.dayCell,
                      { backgroundColor: day.completed ? habit.color : c.surfaceElevated },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.milestonesContainer}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Milestones</Text>
          <View style={styles.milestonesGrid}>
            {milestones.map((milestone) => {
              const unlocked = habit.longestStreak >= milestone.days;
              return (
                <View
                  key={milestone.days}
                  style={[
                    styles.milestoneItem,
                    { backgroundColor: unlocked ? habit.color : c.surfaceElevated },
                  ]}
                >
                  <Ionicons name={milestone.icon as any} size={24} color={unlocked ? '#fff' : c.mutedText} />
                  <Text style={[styles.milestoneText, { color: unlocked ? '#fff' : c.mutedText }]}>
                    {milestone.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.statsContainer}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statItem, { backgroundColor: c.surface }]}>
              <Text style={[styles.statNumber, { color: habit.color }]}>{habit.completedDates.length}</Text>
              <Text style={[styles.statLabel, { color: c.mutedText }]}>Total Days</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: c.surface }]}>
              <Text style={[styles.statNumber, { color: habit.color }]}>{successRate.toFixed(1)}%</Text>
              <Text style={[styles.statLabel, { color: c.mutedText }]}>Success Rate</Text>
            </View>
          </View>
        </View>

        {chartData.labels.length > 1 && (
          <View style={styles.chartContainer}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Streak Progress</Text>
            <LineChart
              data={chartData}
              width={width - 40}
              height={200}
              chartConfig={{
                backgroundColor: c.background,
                backgroundGradientFrom: c.background,
                backgroundGradientTo: c.background,
                decimalPlaces: 0,
                color: (opacity = 1) => habit.color,
                labelColor: (opacity = 1) => c.text,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '4',
                  strokeWidth: '2',
                  stroke: habit.color,
                },
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function generateCalendarData(habit: Habit) {
  const weeks = [];
  const startDate = new Date(habit.startDate);
  const endDate = new Date();

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 7)) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(d);
      day.setDate(d.getDate() + i);
      const dayStr = day.toISOString().split('T')[0];
      week.push({ date: dayStr, completed: habit.completedDates.includes(dayStr) });
    }
    weeks.push(week);
  }
  return weeks.slice(-8); // Last 8 weeks
}

function generateChartData(habit: Habit) {
  const labels = [];
  const data = [];
  const startDate = new Date(habit.startDate);
  const endDate = new Date();

  for (let d = new Date(startDate); d <= endDate; d.setMonth(d.getMonth() + 1)) {
    labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthDates = habit.completedDates.filter(date => {
      const dateObj = new Date(date);
      return dateObj >= monthStart && dateObj <= monthEnd;
    });
    data.push(monthDates.length);
  }

  return {
    labels,
    datasets: [{ data }],
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  streakContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  currentStreak: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  streakLabel: {
    fontSize: 18,
    marginTop: 10,
  },
  longestStreak: {
    fontSize: 14,
    marginTop: 5,
  },
  todayButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 30,
  },
  todayButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  moodContainer: {
    marginBottom: 30,
  },
  moodSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  moodOption: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 2,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesContainer: {
    marginBottom: 30,
  },
  noteInput: {
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    marginTop: 10,
  },
  saveNoteButton: {
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
  },
  saveNoteText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  calendarGrid: {
    flexDirection: 'column',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  dayCell: {
    width: (width - 40 - 35) / 7,
    height: (width - 40 - 35) / 7,
    borderRadius: 4,
  },
  milestonesContainer: {
    marginBottom: 30,
  },
  milestonesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  milestoneItem: {
    width: (width - 40 - 20) / 2,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  milestoneText: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
  statsContainer: {
    marginBottom: 30,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    width: (width - 40 - 20) / 2,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    marginTop: 5,
  },
  chartContainer: {
    marginBottom: 30,
  },
  chart: {
    borderRadius: 16,
  },
});