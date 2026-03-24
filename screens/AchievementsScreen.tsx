import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getAchievements } from '../lib/storage';
import { Achievement } from '../lib/types';

export default function AchievementsScreen() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const { tokens } = useTheme();
  const c = tokens.colors;

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    const loadedAchievements = await getAchievements();
    setAchievements(loadedAchievements);
  };

  const renderAchievement = ({ item }: { item: Achievement }) => (
    <View style={[styles.achievementItem, { backgroundColor: c.surface }]}>
      <View style={[styles.achievementIcon, { backgroundColor: item.unlocked ? item.color : c.surfaceElevated }]}>
        <Ionicons
          name={item.icon as any}
          size={24}
          color={item.unlocked ? '#fff' : c.mutedText}
        />
      </View>
      <View style={styles.achievementInfo}>
        <Text style={[styles.achievementTitle, { color: item.unlocked ? c.text : c.mutedText, textDecorationLine: item.unlocked ? 'none' : 'line-through' }]}>
          {item.name}
        </Text>
        <Text style={[styles.achievementDesc, { color: item.unlocked ? c.mutedText : c.mutedText, opacity: item.unlocked ? 1 : 0.75 }]}>
          {item.description}
        </Text>
        {item.unlocked && (
          <Text style={[styles.achievementPoints, { color: item.color }]}>
            +{item.points} points
          </Text>
        )}
      </View>
      {item.unlocked && (
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
      )}
    </View>
  );

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.text }]}>Achievements</Text>
        <Text style={[styles.subtitle, { color: c.mutedText }]}>
          {unlockedCount} / {achievements.length} unlocked
        </Text>
      </View>

      <FlatList
        data={achievements}
        keyExtractor={(item) => item.id}
        renderItem={renderAchievement}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  listContainer: {
    padding: 20,
  },
  achievementItem: {
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
  achievementIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  achievementDesc: {
    fontSize: 14,
    marginTop: 2,
  },
  achievementPoints: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});