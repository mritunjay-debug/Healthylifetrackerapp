import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { defaultHabits, Habit } from '../lib/types';
import { getHabits, saveHabits } from '../lib/storage';
import { trackEvent } from '../lib/telemetry';

export default function AddHabitScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loaded = await getHabits();
    setHabits(loaded);
    setLoading(false);
  };

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return defaultHabits;
    return defaultHabits.filter((t) => t.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const addHabit = async (template: (typeof defaultHabits)[number]) => {
    const implementationIntent = `If it is my planned ${template.category.toLowerCase()} time, then I will do ${template.name}.`;
    const fallbackAction = `Do 2 minutes of ${template.name.toLowerCase()} to keep momentum.`;
    const newHabit: Habit = {
      ...(template as any),
      id: `habit-${Date.now()}`,
      startDate: new Date().toISOString(),
      completedDates: [],
      currentStreak: 0,
      longestStreak: 0,
      notes: [],
      points: 0,
      isActive: true,
      implementationIntent,
      fallbackAction,
    };

    const updated = [...habits, newHabit];
    setHabits(updated);
    await saveHabits(updated);
    await trackEvent('habit_created', {
      habit_id: newHabit.id,
      goal_type: newHabit.category,
      difficulty_tier: newHabit.targetDays >= 30 ? 'high_effort' : 'moderate',
      has_implementation_intent: Boolean(newHabit.implementationIntent),
    });
    Alert.alert('Success', `${newHabit.name} added!`, [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Add Habit</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={isDark ? '#555' : '#ccc'} style={styles.searchIcon} />
        <TextInput
          style={[
            styles.searchInput,
            {
              color: isDark ? '#fff' : '#000',
              backgroundColor: isDark ? '#111' : '#f5f5f5',
            },
          ]}
          placeholder="Search templates..."
          placeholderTextColor={isDark ? '#555' : '#ccc'}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <View style={styles.loading}>
          <Ionicons name="hourglass" size={32} color={isDark ? '#0EA5E9' : '#0EA5E9'} />
          <Text style={[styles.loadingText, { color: isDark ? '#ccc' : '#666' }]}>Loading...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTemplates}
          keyExtractor={(item, idx) => `${item.name}-${idx}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.templateCard,
                {
                  backgroundColor: isDark ? '#111' : '#f5f5f5',
                  borderColor: isDark ? '#222' : '#eee',
                },
              ]}
              onPress={() => addHabit(item)}
            >
              <View style={styles.templateLeft}>
                <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon as any} size={24} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.templateName, { color: isDark ? '#fff' : '#000' }]}>{item.name}</Text>
                  <Text style={[styles.templateDesc, { color: isDark ? '#ccc' : '#666' }]}>{item.description}</Text>
                  <Text style={[styles.templateTarget, { color: isDark ? '#aaa' : '#888' }]}>
                    Target: {item.targetDays} days
                  </Text>
                </View>
              </View>
              <Ionicons name="add-circle" size={24} color="#0EA5E9" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="copy-outline" size={48} color={isDark ? '#555' : '#ccc'} />
              <Text style={[styles.emptyText, { color: isDark ? '#aaa' : '#888' }]}>No templates match.</Text>
            </View>
          }
        />
      )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#00000000',
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 8, fontSize: 14, fontWeight: '600' },
  listContent: { padding: 20, paddingBottom: 120 },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  templateLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  templateName: { fontSize: 16, fontWeight: '700' },
  templateDesc: { fontSize: 13, marginTop: 3 },
  templateTarget: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { marginTop: 12, fontSize: 16, fontWeight: '600' },
});

