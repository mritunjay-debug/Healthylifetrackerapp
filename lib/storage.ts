import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, Niche, Achievement, UserStats, DailyChallenge, QuitProfile, CravingLog, SavingsGoal, DietLog, CravingSwap } from './types';

const HABITS_KEY = '@habits';
const NICHES_KEY = '@niches';
const ONBOARDED_KEY = '@onboarded';
const ACHIEVEMENTS_KEY = '@achievements';
const USER_STATS_KEY = '@user_stats';
const DAILY_CHALLENGES_KEY = '@daily_challenges';
const QUIT_PROFILE_KEY = '@quit_profile';
const CRAVING_LOGS_KEY = '@craving_logs';
const SAVINGS_GOALS_KEY = '@savings_goals';
const DIET_LOGS_KEY = '@diet_logs';
const CRAVING_SWAPS_KEY = '@craving_swaps';
const AUTH_SKIPPED_KEY = '@auth_skipped';

export async function getHabits(): Promise<Habit[]> {
  try {
    const habits = await AsyncStorage.getItem(HABITS_KEY);
    return habits ? JSON.parse(habits) : [];
  } catch (error) {
    console.error('Error getting habits:', error);
    return [];
  }
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
  } catch (error) {
    console.error('Error saving habits:', error);
  }
}

export async function getNiches(): Promise<Niche[]> {
  try {
    const niches = await AsyncStorage.getItem(NICHES_KEY);
    return niches ? JSON.parse(niches) : [];
  } catch (error) {
    console.error('Error getting niches:', error);
    return [];
  }
}

export async function saveNiches(niches: Niche[]): Promise<void> {
  try {
    await AsyncStorage.setItem(NICHES_KEY, JSON.stringify(niches));
  } catch (error) {
    console.error('Error saving niches:', error);
  }
}

export async function isOnboarded(): Promise<boolean> {
  try {
    const onboarded = await AsyncStorage.getItem(ONBOARDED_KEY);
    return onboarded === 'true';
  } catch (error) {
    return false;
  }
}

export async function setOnboarded(): Promise<void> {
  try {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
  } catch (error) {
    console.error('Error setting onboarded:', error);
  }
}

export async function isAuthSkipped(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(AUTH_SKIPPED_KEY)) === 'true';
  } catch {
    return false;
  }
}

export async function setAuthSkipped(skipped: boolean): Promise<void> {
  try {
    if (skipped) await AsyncStorage.setItem(AUTH_SKIPPED_KEY, 'true');
    else await AsyncStorage.removeItem(AUTH_SKIPPED_KEY);
  } catch (error) {
    console.error('Error setting auth skipped:', error);
  }
}

export async function clearAuthSkipped(): Promise<void> {
  await setAuthSkipped(false);
}

export async function getAchievements(): Promise<Achievement[]> {
  try {
    const achievements = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    return achievements ? JSON.parse(achievements) : [];
  } catch (error) {
    console.error('Error getting achievements:', error);
    return [];
  }
}

export async function saveAchievements(achievements: Achievement[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  } catch (error) {
    console.error('Error saving achievements:', error);
  }
}

export async function getUserStats(): Promise<UserStats> {
  try {
    const stats = await AsyncStorage.getItem(USER_STATS_KEY);
    return stats ? JSON.parse(stats) : {
      totalPoints: 0,
      level: 1,
      experience: 0,
      experienceToNext: 100,
      longestStreakEver: 0,
      totalHabitsCompleted: 0,
      currentActiveHabits: 0,
      perfectWeeks: 0,
      perfectMonths: 0,
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    return {
      totalPoints: 0,
      level: 1,
      experience: 0,
      experienceToNext: 100,
      longestStreakEver: 0,
      totalHabitsCompleted: 0,
      currentActiveHabits: 0,
      perfectWeeks: 0,
      perfectMonths: 0,
    };
  }
}

export async function saveUserStats(stats: UserStats): Promise<void> {
  try {
    await AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving user stats:', error);
  }
}

export async function getDailyChallenges(): Promise<DailyChallenge[]> {
  try {
    const challenges = await AsyncStorage.getItem(DAILY_CHALLENGES_KEY);
    return challenges ? JSON.parse(challenges) : [];
  } catch (error) {
    console.error('Error getting daily challenges:', error);
    return [];
  }
}

export async function saveDailyChallenges(challenges: DailyChallenge[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DAILY_CHALLENGES_KEY, JSON.stringify(challenges));
  } catch (error) {
    console.error('Error saving daily challenges:', error);
  }
}

export async function getQuitProfile(): Promise<QuitProfile | null> {
  try {
    const profile = await AsyncStorage.getItem(QUIT_PROFILE_KEY);
    return profile ? JSON.parse(profile) : null;
  } catch (error) {
    console.error('Error getting quit profile:', error);
    return null;
  }
}

export async function saveQuitProfile(profile: QuitProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(QUIT_PROFILE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving quit profile:', error);
  }
}

export async function getCravingLogs(): Promise<CravingLog[]> {
  try {
    const logs = await AsyncStorage.getItem(CRAVING_LOGS_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Error getting craving logs:', error);
    return [];
  }
}

export async function saveCravingLogs(logs: CravingLog[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CRAVING_LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error saving craving logs:', error);
  }
}

export async function getSavingsGoals(): Promise<SavingsGoal[]> {
  try {
    const goals = await AsyncStorage.getItem(SAVINGS_GOALS_KEY);
    return goals ? JSON.parse(goals) : [];
  } catch (error) {
    console.error('Error getting savings goals:', error);
    return [];
  }
}

export async function saveSavingsGoals(goals: SavingsGoal[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVINGS_GOALS_KEY, JSON.stringify(goals));
  } catch (error) {
    console.error('Error saving savings goals:', error);
  }
}

export async function getDietLogs(): Promise<DietLog[]> {
  try {
    const logs = await AsyncStorage.getItem(DIET_LOGS_KEY);
    return logs ? JSON.parse(logs) : [];
  } catch (error) {
    console.error('Error getting diet logs:', error);
    return [];
  }
}

export async function saveDietLogs(logs: DietLog[]): Promise<void> {
  try {
    await AsyncStorage.setItem(DIET_LOGS_KEY, JSON.stringify(logs));
  } catch (error) {
    console.error('Error saving diet logs:', error);
  }
}

export async function getCravingSwaps(): Promise<CravingSwap[]> {
  try {
    const swaps = await AsyncStorage.getItem(CRAVING_SWAPS_KEY);
    return swaps ? JSON.parse(swaps) : [];
  } catch (error) {
    console.error('Error getting craving swaps:', error);
    return [];
  }
}

export async function saveCravingSwaps(swaps: CravingSwap[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CRAVING_SWAPS_KEY, JSON.stringify(swaps));
  } catch (error) {
    console.error('Error saving craving swaps:', error);
  }
}