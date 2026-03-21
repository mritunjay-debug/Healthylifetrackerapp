import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { isOnboarded } from '../lib/storage';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import HabitsScreen from '../screens/HabitsScreen';
import AddHabitScreen from '../screens/AddHabitScreen';
import HabitDetailScreen from '../screens/HabitDetailScreen';
import StatsScreen from '../screens/StatsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import QuitDashboardScreen from '../screens/QuitDashboardScreen';
import QuitOnboardingScreen from '../screens/QuitOnboardingScreen';
import QuitSettingsScreen from '../screens/QuitSettingsScreen';
import CravingsLogScreen from '../screens/CravingsLogScreen';
import SavingsScreen from '../screens/SavingsScreen';
import HealthTimelineScreen from '../screens/HealthTimelineScreen';
import DietTrackerScreen from '../screens/DietTrackerScreen';
import PersonalTrackerScreen from '../screens/PersonalTrackerScreen';
import WisdomManagerScreen from '../screens/WisdomManagerScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { isDark } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Habits') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Stats') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'Quit') {
            iconName = focused ? 'leaf' : 'leaf-outline';
          } else if (route.name === 'Achievements') {
            iconName = focused ? 'trophy' : 'trophy-outline';
          } else if (route.name === 'Tracker') {
            iconName = focused ? 'albums' : 'albums-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0EA5E9',
        tabBarInactiveTintColor: isDark ? '#555' : '#ccc',
        tabBarStyle: {
          backgroundColor: isDark ? '#000' : '#fff',
          borderTopColor: isDark ? '#222' : '#eee',
        },
        headerStyle: {
          backgroundColor: isDark ? '#000' : '#fff',
        },
        headerTintColor: isDark ? '#fff' : '#000',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Habits" component={HabitsScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Quit" component={QuitDashboardScreen} />
      <Tab.Screen name="Tracker" component={PersonalTrackerScreen} />
      <Tab.Screen name="Achievements" component={AchievementsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { loading: authLoading, session, guestMode } = useAuth();
  const [onboardedState, setOnboardedState] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    isOnboarded().then(setOnboardedState);
  }, []);

  const ready = !authLoading && onboardedState !== null;

  const initialRouteName = React.useMemo(() => {
    if (!session && !guestMode) return 'Login';
    if (!onboardedState) return 'Onboarding';
    return 'Main';
  }, [session, guestMode, onboardedState]);

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="HabitDetail" component={HabitDetailScreen} />
        <Stack.Screen name="AddHabit" component={AddHabitScreen} />
        <Stack.Screen name="QuitOnboarding" component={QuitOnboardingScreen} />
        <Stack.Screen name="QuitSettings" component={QuitSettingsScreen} />
        <Stack.Screen name="CravingsLog" component={CravingsLogScreen} />
        <Stack.Screen name="Savings" component={SavingsScreen} />
        <Stack.Screen name="HealthTimeline" component={HealthTimelineScreen} />
        <Stack.Screen name="DietTracker" component={DietTrackerScreen} />
        <Stack.Screen name="WisdomManager" component={WisdomManagerScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
