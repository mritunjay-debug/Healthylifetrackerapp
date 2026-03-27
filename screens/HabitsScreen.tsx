import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getHabits, saveHabits, getNiches } from '../lib/storage';
import { Habit, defaultHabits, Niche } from '../lib/types';
import AIAssistCard from '../components/ui/AIAssistCard';
import { getDietCoachSuggestions } from '../lib/aiCoachApi';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function HabitsScreen() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [niches, setNiches] = useState<Niche[]>([]);
  const [aiLines, setAiLines] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState<'external' | 'local-fallback' | null>(null);
  const navigation = useNavigation<any>();
  const { tokens } = useTheme();
  const c = tokens.colors;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    void refreshHabitsAi('Suggest how I should prioritize my habits today.');
  }, [habits.length, searchQuery]);

  const loadData = async () => {
    const loadedHabits = await getHabits();
    const loadedNiches = await getNiches();
    setHabits(loadedHabits);
    setNiches(loadedNiches);
  };

  const addDefaultHabit = async (template: any) => {
    const newHabit: Habit = {
      ...template,
      id: `habit-${Date.now()}`,
      startDate: new Date().toISOString(),
      completedDates: [],
      currentStreak: 0,
      longestStreak: 0,
      notes: [],
    };
    const updatedHabits = [...habits, newHabit];
    setHabits(updatedHabits);
    await saveHabits(updatedHabits);
    Alert.alert('Success', `${newHabit.name} added!`);
  };

  const refreshHabitsAi = async (focus: string) => {
    try {
      setAiLoading(true);
      const resp = await getDietCoachSuggestions({
        profile: {},
        logs: [],
        budget: 0,
        todayIntake: 0,
        context: 'habits',
        focus,
        payloadSummary: `totalHabits=${habits.length}, query=${searchQuery || 'none'}`,
      });
      setAiLines(resp.suggestions);
      setAiSource(resp.source);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredHabits = habits.filter(habit =>
    habit.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderHabitItem = ({ item }: { item: Habit }) => (
    <TouchableOpacity
      style={[styles.habitCard, { backgroundColor: c.surface }]}
      onPress={() => navigation.navigate('HabitDetail', { habitId: item.id })}
    >
      <View style={styles.habitLeft}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon as any} size={24} color="#fff" />
        </View>
        <View style={styles.habitInfo}>
          <Text style={[styles.habitName, { color: c.text }]}>{item.name}</Text>
          <Text style={[styles.habitDescription, { color: c.mutedText }]}>{item.description}</Text>
          <Text style={[styles.habitStreak, { color: c.mutedText }]}>
            Best: {item.longestStreak} days
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={c.mutedText} />
    </TouchableOpacity>
  );

  const renderDefaultHabit = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.defaultCard, { backgroundColor: c.surface }]}
      onPress={() => addDefaultHabit(item)}
    >
      <View style={styles.habitLeft}>
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon as any} size={24} color="#fff" />
        </View>
        <View style={styles.habitInfo}>
          <Text style={[styles.habitName, { color: c.text }]}>{item.name}</Text>
          <Text style={[styles.habitDescription, { color: c.mutedText }]}>{item.description}</Text>
          <Text style={[styles.habitTarget, { color: c.mutedText }]}>
            Target: {item.targetDays} days
          </Text>
        </View>
      </View>
      <Ionicons name="add-circle" size={24} color={c.primary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <Animated.View entering={FadeInDown.duration(380)} style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Habits Library</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddHabit')}
        >
          <Ionicons name="add" size={24} color={c.primary} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(80).duration(380)} style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={c.mutedText} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: c.text, backgroundColor: c.surfaceElevated }]}
          placeholder="Search habits..."
          placeholderTextColor={c.mutedText}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(140).duration(420)} style={{ flex: 1 }}>
        <FlatList
        data={filteredHabits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabitItem}
        ListHeaderComponent={
          <>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Your Habits</Text>
            <AIAssistCard
              title="AI Habit Assistant"
              subtitle="Get priority and consistency suggestions."
              lines={aiLines}
              loading={aiLoading}
              source={aiSource}
              onRefresh={() => refreshHabitsAi('Refresh my habit suggestions for today.')}
              onOpenFullScreen={() =>
                navigation.navigate('AIAssistant', {
                  title: 'AI Habit Assistant',
                  subtitle: 'Habits guidance in full-screen mode',
                  context: 'habits',
                  initialFocus: 'Suggest how I should prioritize my habits today.',
                  payloadSummary: `totalHabits=${habits.length}, query=${searchQuery || 'none'}`,
                })
              }
              actions={[
                { label: 'Prioritize now', onPress: () => refreshHabitsAi('Which habit should I do first right now?') },
                { label: 'Missed yesterday', onPress: () => refreshHabitsAi('What to do if I missed habits yesterday?') },
              ]}
              colors={c}
            />
          </>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: c.mutedText }]}>No habits yet. Add some below!</Text>
        }
        ListFooterComponent={
          <>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Popular Templates</Text>
            <FlatList
              data={defaultHabits}
              keyExtractor={(item, index) => `default-${index}`}
              renderItem={renderDefaultHabit}
              scrollEnabled={false}
            />
          </>
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  addButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    borderRadius: 10,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginVertical: 20,
  },
  habitCard: {
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
  defaultCard: {
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
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  habitDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  habitStreak: {
    fontSize: 12,
  },
  habitTarget: {
    fontSize: 12,
  },
});