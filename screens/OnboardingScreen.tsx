import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { niches, defaultHabits, achievements } from '../lib/types';
import { setOnboarded, saveHabits, saveNiches, saveAchievements, saveUserStats } from '../lib/storage';
import { startSensorTracking } from '../lib/sensorTracking';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    title: 'Build Unbreakable Streaks',
    subtitle: 'Offline. Private. Forever.',
    description: 'Track habits with glowing chains that break darkness.',
    icon: 'link-outline',
  },
  {
    title: 'Quick Habit Examples',
    subtitle: 'Drink water, fast 16:8, no vape today, read 10 pages',
    description: 'Start with proven templates or create your own.',
    icon: 'water-outline',
  },
  {
    title: '100% Offline & Private',
    subtitle: 'Your data stays on your device',
    description: 'No accounts, no tracking, no cloud. Just you and your streaks.',
    icon: 'shield-checkmark-outline',
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigation = useNavigation<any>();
  const { tokens, isDark } = useTheme();
  const c = tokens.colors;

  const handleGetStarted = async () => {
    await setOnboarded();
    // Initialize with default niches and habits
    await saveNiches(niches);
    const initialHabits = defaultHabits.map((habit, index) => ({
      ...habit,
      id: `habit-${index}`,
      startDate: new Date().toISOString(),
      completedDates: [],
      currentStreak: 0,
      longestStreak: 0,
      notes: [],
      points: 0,
      isActive: true,
    }));
    await saveHabits(initialHabits);

    // Initialize achievements
    await saveAchievements(achievements);

    // Initialize user stats
    await saveUserStats({
      totalPoints: 0,
      level: 1,
      experience: 0,
      experienceToNext: 100,
      longestStreakEver: 0,
      totalHabitsCompleted: 0,
      currentActiveHabits: initialHabits.length,
      perfectWeeks: 0,
      perfectMonths: 0,
    });

    // Start sensor tracking
    await startSensorTracking();

    navigation.replace('Main');
  };

  const slide = slides[currentSlide];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name={slide.icon as any} size={80} color={c.primary} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>{slide.title}</Text>
        <Text style={[styles.subtitle, { color: c.mutedText }]}>{slide.subtitle}</Text>
        <Text style={[styles.description, { color: c.mutedText }]}>{slide.description}</Text>
      </View>

      <View style={styles.bottomContainer}>
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index === currentSlide ? c.primary : (isDark ? c.border : '#ddd') },
              ]}
            />
          ))}
        </View>

        {currentSlide < slides.length - 1 ? (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => setCurrentSlide(currentSlide + 1)}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.getStartedButtonText}>Get Started</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 5,
  },
  nextButton: {
    backgroundColor: '#0EA5E9',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  getStartedButton: {
    backgroundColor: '#F97316',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  getStartedButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});