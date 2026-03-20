export interface Habit {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  targetDays: number;
  currentStreak: number;
  longestStreak: number;
  completedDates: string[]; // ISO date strings
  startDate: string; // ISO date string
  reminders: boolean;
  reminderTime?: string; // HH:MM format
  notes: string[];
  points: number; // Points earned
  isActive: boolean;
  goal?: string; // Personal goal text
  implementationIntent?: string; // If [context], then I will [action]
  fallbackAction?: string; // Two-minute fallback action
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
  unlockedDate?: string;
  condition: (habits: Habit[], stats: UserStats) => boolean;
  points: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  completed: boolean;
  points: number;
  date: string; // YYYY-MM-DD
  type: 'streak' | 'completion' | 'variety' | 'consistency';
}

export interface UserStats {
  totalPoints: number;
  level: number;
  experience: number;
  experienceToNext: number;
  longestStreakEver: number;
  totalHabitsCompleted: number;
  currentActiveHabits: number;
  perfectWeeks: number;
  perfectMonths: number;
}

export interface Milestone {
  days: number;
  name: string;
  icon: string;
  description: string;
  points: number;
}

export interface QuitProfile {
  id: string;
  startDate: string;
  dailyAmount: number; // cigarettes or puffs per day
  costPerUnit: number; // cost per cigarette/pack/vape
  currency: string;
  nicotineStrength?: number;
  weightGoal?: number;
  currentWeight?: number;
  quitType: 'smoking' | 'vaping';
}

export interface CravingLog {
  id: string;
  timestamp: string;
  intensity: number; // 1-10
  triggers: string[];
  mood: string;
  location?: string;
  copingStrategy?: string;
  outcome: 'resisted' | 'slipped' | 'gave_in';
}

export interface HealthMilestone {
  days: number;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedDate?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  imageUri?: string;
  description?: string;
}

export interface DietLog {
  id: string;
  date: string;
  weight?: number;
  calories?: number;
  targetCalories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
  waterGlasses?: number;
  mood: number; // 1-5
  energy: number; // 1-5
  wins: string[];
  challenges: string[];
  mealEntries?: {
    id: string;
    meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    name: string;
    calories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    timestamp: string;
  }[];
}

export interface CravingSwap {
  id: string;
  timestamp: string;
  originalCraving: string;
  replacement: string;
  success: boolean;
  notes?: string;
}

export interface Niche {
  id: string;
  name: string;
  color: string;
  accent: string;
  habits: Habit[];
}

export const niches: Niche[] = [
  {
    id: 'general',
    name: 'General Habits',
    color: '#0EA5E9',
    accent: '#F97316',
    habits: [],
  },
  {
    id: 'fasting',
    name: 'Intermittent Fasting',
    color: '#10B981',
    accent: '#F59E0B',
    habits: [],
  },
  {
    id: 'quit',
    name: 'Quit Vaping/Smoking',
    color: '#EF4444',
    accent: '#7C3AED',
    habits: [],
  },
];

export const defaultHabits: Omit<Habit, 'id' | 'startDate' | 'completedDates' | 'currentStreak' | 'longestStreak' | 'notes' | 'points' | 'isActive'>[] = [
  {
    name: 'Drink Water',
    description: 'Stay hydrated daily',
    icon: 'water',
    color: '#0EA5E9',
    category: 'Health',
    targetDays: 7,
    reminders: false,
    goal: 'Drink 8 glasses of water',
  },
  {
    name: '16:8 Intermittent Fasting',
    description: 'Fast for 16 hours daily',
    icon: 'time',
    color: '#10B981',
    category: 'Fasting',
    targetDays: 30,
    reminders: true,
    reminderTime: '20:00',
    goal: '16 hours fasting window',
  },
  {
    name: 'No Vaping Today',
    description: 'Stay vape-free',
    icon: 'flame',
    color: '#EF4444',
    category: 'Quit Bad Habits',
    targetDays: 30,
    reminders: true,
    reminderTime: '08:00',
    goal: 'Zero nicotine today',
  },
  {
    name: 'Exercise 30min',
    description: 'Daily workout',
    icon: 'fitness',
    color: '#F97316',
    category: 'Productivity',
    targetDays: 7,
    reminders: false,
    goal: '30 minutes of movement',
  },
  {
    name: 'Read 10 Pages',
    description: 'Daily reading habit',
    icon: 'book',
    color: '#7C3AED',
    category: 'Productivity',
    targetDays: 7,
    reminders: false,
    goal: '10 pages of knowledge',
  },
  {
    name: 'No Sugar',
    description: 'Cut out sugar',
    icon: 'cafe',
    color: '#F59E0B',
    category: 'Health',
    targetDays: 30,
    reminders: false,
    goal: 'Sugar-free day',
  },
  {
    name: 'Sleep 7+ Hours',
    description: 'Get quality sleep every night',
    icon: 'moon',
    color: '#6366F1',
    category: 'Health',
    targetDays: 30,
    reminders: true,
    reminderTime: '22:00',
    goal: '7+ hours of quality sleep',
  },
  {
    name: '10,000 Steps Daily',
    description: 'Stay active with daily steps',
    icon: 'walk',
    color: '#10B981',
    category: 'Fitness',
    targetDays: 30,
    reminders: false,
    goal: '10,000 steps per day',
  },
  {
    name: 'Running Session',
    description: 'Go for a run or brisk walk',
    icon: 'fitness',
    color: '#F97316',
    category: 'Fitness',
    targetDays: 7,
    reminders: false,
    goal: '30+ minutes of cardio',
  },
];

export const milestones: Milestone[] = [
  { days: 7, name: 'Week Warrior', icon: 'star', description: '7 days strong!', points: 50 },
  { days: 30, name: 'Month Master', icon: 'trophy', description: '30 days of consistency!', points: 150 },
  { days: 100, name: 'Century Champion', icon: 'crown', description: '100 days achieved!', points: 500 },
  { days: 365, name: 'Year Legend', icon: 'gem', description: '365 days of dedication!', points: 2000 },
];

export const achievements: Achievement[] = [
  {
    id: 'first_habit',
    name: 'Getting Started',
    description: 'Complete your first habit',
    icon: 'checkmark-circle',
    color: '#10B981',
    unlocked: false,
    points: 25,
    condition: (habits) => habits.some(h => h.completedDates.length > 0),
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Maintain a 30-day streak',
    icon: 'flame',
    color: '#EF4444',
    unlocked: false,
    points: 200,
    condition: (habits, stats) => stats.longestStreakEver >= 30,
  },
  {
    id: 'habit_collector',
    name: 'Habit Collector',
    description: 'Create 5 active habits',
    icon: 'library',
    color: '#7C3AED',
    unlocked: false,
    points: 100,
    condition: (habits) => habits.filter(h => h.isActive).length >= 5,
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    description: 'Complete all habits for 7 days straight',
    icon: 'calendar',
    color: '#0EA5E9',
    unlocked: false,
    points: 300,
    condition: (habits, stats) => stats.perfectWeeks >= 1,
  },
  {
    id: 'level_up',
    name: 'Level Up',
    description: 'Reach level 5',
    icon: 'trending-up',
    color: '#F97316',
    unlocked: false,
    points: 250,
    condition: (habits, stats) => stats.level >= 5,
  },
];