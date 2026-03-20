import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer, Pedometer } from 'expo-sensors';
import { Habit } from './types';

// Sensor data types
export interface SensorData {
  timestamp: number;
  accelerometer?: { x: number; y: number; z: number };
  gyroscope?: { x: number; y: number; z: number };
  steps?: number;
  heartRate?: number;
}

export interface SleepData {
  startTime: number;
  endTime: number;
  quality: number; // 1-5 scale
  duration: number; // in minutes
  interruptions: number;
}

export interface ActivityData {
  date: string;
  steps: number;
  distance: number; // in meters
  calories: number;
  activeMinutes: number;
}

const SENSOR_DATA_KEY = '@sensor_data';
const SLEEP_DATA_KEY = '@sleep_data';
const ACTIVITY_DATA_KEY = '@activity_data';
const TRACKING_ENABLED_KEY = '@tracking_enabled';
const RUNNING_ACTIVE_KEY = '@running_active';
const SLEEP_SCHEDULE_HOUR_KEY = '@sleep_schedule_hour';
const SENSOR_MODE_KEY = '@sensor_mode';

let runningInterval: ReturnType<typeof setInterval> | null = null;
let pedometerSub: { remove: () => void } | null = null;
let accelerometerSub: { remove: () => void } | null = null;
let simulationInterval: ReturnType<typeof setInterval> | null = null;
let lastPedometerCount = 0;

// Simulated sensor data generation
export function generateMockAccelerometerData(): { x: number; y: number; z: number } {
  // Simulate gravity + small movements
  const gravity = 9.81;
  const noise = (Math.random() - 0.5) * 0.5; // Small random movements
  return {
    x: noise,
    y: noise,
    z: gravity + noise,
  };
}

export function generateMockSteps(): number {
  // Simulate step counting (more steps during active periods)
  const hour = new Date().getHours();
  const isActiveTime = hour >= 7 && hour <= 22; // Active during day
  const baseSteps = isActiveTime ? Math.random() * 50 : Math.random() * 5;
  return Math.floor(baseSteps);
}

// Sleep detection algorithm
export function detectSleepFromMotion(sensorData: SensorData[]): SleepData | null {
  if (sensorData.length < 60) return null; // Need at least 1 hour of data

  const sleepStartThreshold = 20 * 60 * 1000; // 20 minutes of low motion
  const sleepEndThreshold = 10 * 60 * 1000; // 10 minutes of motion to wake

  let sleepStart: number | null = null;
  let interruptions = 0;
  let totalSleepTime = 0;

  // Simple sleep detection: periods of low acceleration variance
  for (let i = 0; i < sensorData.length; i++) {
    const data = sensorData[i];
    if (!data.accelerometer) continue;

    const magnitude = Math.sqrt(
      data.accelerometer.x ** 2 +
      data.accelerometer.y ** 2 +
      data.accelerometer.z ** 2
    );

    const isLowMotion = magnitude < 10.5 && magnitude > 9.5; // Close to gravity

    if (isLowMotion && sleepStart === null) {
      // Check if we've had low motion for threshold
      let consecutiveLowMotion = 0;
      for (let j = i; j >= 0 && j >= i - 20; j--) {
        const prevData = sensorData[j];
        if (prevData.accelerometer) {
          const prevMagnitude = Math.sqrt(
            prevData.accelerometer.x ** 2 +
            prevData.accelerometer.y ** 2 +
            prevData.accelerometer.z ** 2
          );
          if (prevMagnitude < 10.5 && prevMagnitude > 9.5) {
            consecutiveLowMotion++;
          } else {
            break;
          }
        }
      }

      if (consecutiveLowMotion >= 20) { // 20 minutes of low motion
        sleepStart = data.timestamp;
      }
    } else if (!isLowMotion && sleepStart !== null) {
      // Check if motion persists
      let consecutiveMotion = 0;
      for (let j = i; j < sensorData.length && j <= i + 10; j++) {
        const nextData = sensorData[j];
        if (nextData.accelerometer) {
          const nextMagnitude = Math.sqrt(
            nextData.accelerometer.x ** 2 +
            nextData.accelerometer.y ** 2 +
            nextData.accelerometer.z ** 2
          );
          if (nextMagnitude > 10.5 || nextMagnitude < 9.5) {
            consecutiveMotion++;
          } else {
            break;
          }
        }
      }

      if (consecutiveMotion >= 10) { // 10 minutes of motion = wake up
        totalSleepTime += data.timestamp - sleepStart;
        interruptions++;
        sleepStart = null;
      }
    } else if (sleepStart !== null) {
      // Continuing sleep
      totalSleepTime = data.timestamp - sleepStart;
    }
  }

  if (sleepStart && totalSleepTime > 0) {
    const durationHours = totalSleepTime / (1000 * 60 * 60);
    let quality = 3; // Base quality

    if (durationHours >= 7 && durationHours <= 9) quality += 1;
    if (interruptions === 0) quality += 1;
    if (interruptions > 2) quality -= 1;

    quality = Math.max(1, Math.min(5, quality));

    return {
      startTime: sleepStart,
      endTime: Date.now(),
      quality,
      duration: Math.floor(totalSleepTime / (1000 * 60)), // minutes
      interruptions,
    };
  }

  return null;
}

// Activity tracking
export async function recordActivityData(): Promise<void> {
  const stepDelta = generateMockSteps();
  await updateActivityWithStepDelta(stepDelta);
}

async function updateActivityWithStepDelta(stepDelta: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const existingData = await getActivityData();
  const todayData = existingData.find(d => d.date === today);

  if (todayData) {
    // Update existing data
    const safeDelta = Math.max(0, stepDelta);
    todayData.steps += safeDelta;
    todayData.distance += safeDelta * 0.8; // meters per step (rough)
    todayData.calories += Math.floor(safeDelta * 0.04); // rough calories per step
    todayData.activeMinutes += Math.floor(safeDelta / 100); // rough active minutes from steps

    const updatedData = existingData.map(d => d.date === today ? todayData : d);
    await AsyncStorage.setItem(ACTIVITY_DATA_KEY, JSON.stringify(updatedData));
  } else {
    // Create new data
    const safeDelta = Math.max(0, stepDelta);
    const newData: ActivityData = {
      date: today,
      steps: safeDelta,
      distance: safeDelta * 0.8,
      calories: Math.floor(safeDelta * 0.04),
      activeMinutes: Math.floor(safeDelta / 100),
    };
    await AsyncStorage.setItem(ACTIVITY_DATA_KEY, JSON.stringify([...existingData, newData]));
  }
}

export async function getActivityData(): Promise<ActivityData[]> {
  try {
    const data = await AsyncStorage.getItem(ACTIVITY_DATA_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting activity data:', error);
    return [];
  }
}

export async function getSleepData(): Promise<SleepData[]> {
  try {
    const data = await AsyncStorage.getItem(SLEEP_DATA_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting sleep data:', error);
    return [];
  }
}

export async function saveSleepData(sleepData: SleepData): Promise<void> {
  try {
    const existing = await getSleepData();
    await AsyncStorage.setItem(SLEEP_DATA_KEY, JSON.stringify([...existing, sleepData]));
  } catch (error) {
    console.error('Error saving sleep data:', error);
  }
}

export async function isTrackingEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(TRACKING_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    return false;
  }
}

export async function setTrackingEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(TRACKING_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.error('Error setting tracking enabled:', error);
  }
}

// Background tracking simulation
export async function startSensorTracking(): Promise<void> {
  const enabled = await isTrackingEnabled();
  if (!enabled) return;

  await startLiveSensorCapture();
}

export async function isRunningSessionActive(): Promise<boolean> {
  try {
    const active = await AsyncStorage.getItem(RUNNING_ACTIVE_KEY);
    return active === 'true';
  } catch {
    return false;
  }
}

export async function startRunningSession(): Promise<void> {
  await AsyncStorage.setItem(RUNNING_ACTIVE_KEY, 'true');
  if (runningInterval) clearInterval(runningInterval);
  // If real pedometer is unavailable, we keep a dense simulated fallback.
  runningInterval = setInterval(async () => {
    await recordActivityData();
    await recordActivityData();
    await recordActivityData();
  }, 15000);
}

export async function stopRunningSession(): Promise<void> {
  await AsyncStorage.setItem(RUNNING_ACTIVE_KEY, 'false');
  if (runningInterval) {
    clearInterval(runningInterval);
    runningInterval = null;
  }
}

export async function getSleepScheduleHour(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(SLEEP_SCHEDULE_HOUR_KEY);
    const hour = raw ? parseInt(raw, 10) : 22;
    if (Number.isNaN(hour)) return 22;
    return Math.max(0, Math.min(23, hour));
  } catch {
    return 22;
  }
}

export async function setSleepScheduleHour(hour: number): Promise<void> {
  const safeHour = Math.max(0, Math.min(23, Math.round(hour)));
  await AsyncStorage.setItem(SLEEP_SCHEDULE_HOUR_KEY, String(safeHour));
}

export async function logSleepSessionAtHour(hour: number): Promise<SleepData> {
  const now = new Date();
  const end = now.getTime();
  const start = new Date(now);
  start.setHours(hour, 0, 0, 0);
  if (start.getTime() > end) start.setDate(start.getDate() - 1);

  const durationMin = Math.max(30, Math.floor((end - start.getTime()) / (1000 * 60)));
  const quality = durationMin >= 420 ? 4 : durationMin >= 360 ? 3 : 2;
  const sleepData: SleepData = {
    startTime: start.getTime(),
    endTime: end,
    quality,
    duration: durationMin,
    interruptions: durationMin >= 360 ? 0 : 1,
  };
  await saveSleepData(sleepData);
  return sleepData;
}

export async function getSensorMode(): Promise<'real' | 'simulated' | 'off'> {
  try {
    const mode = await AsyncStorage.getItem(SENSOR_MODE_KEY);
    if (mode === 'real' || mode === 'simulated') return mode;
    return 'off';
  } catch {
    return 'off';
  }
}

export async function startLiveSensorCapture(): Promise<'real' | 'simulated'> {
  const enabled = await isTrackingEnabled();
  if (!enabled) return 'simulated';

  try {
    const available = await Pedometer.isAvailableAsync();
    const perm = await Pedometer.getPermissionsAsync();
    const granted = perm.granted || perm.status === 'granted';
    const finalGranted = granted ? true : (await Pedometer.requestPermissionsAsync()).granted;

    if (available && finalGranted) {
      if (simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
      }
      if (pedometerSub) pedometerSub.remove();
      if (accelerometerSub) accelerometerSub.remove();

      lastPedometerCount = 0;
      pedometerSub = Pedometer.watchStepCount(async (result) => {
        const delta = Math.max(0, result.steps - lastPedometerCount);
        lastPedometerCount = result.steps;
        if (delta > 0) await updateActivityWithStepDelta(delta);
      });

      // Optional motion stream for future sleep/quality models.
      Accelerometer.setUpdateInterval(60000);
      accelerometerSub = Accelerometer.addListener(async (accel) => {
        const existingRaw = await AsyncStorage.getItem(SENSOR_DATA_KEY);
        const data: SensorData[] = existingRaw ? JSON.parse(existingRaw) : [];
        data.push({
          timestamp: Date.now(),
          accelerometer: { x: accel.x, y: accel.y, z: accel.z },
        });
        // Keep small rolling window.
        const trimmed = data.slice(-720); // ~12h at 1-min samples
        await AsyncStorage.setItem(SENSOR_DATA_KEY, JSON.stringify(trimmed));
      });

      await AsyncStorage.setItem(SENSOR_MODE_KEY, 'real');
      return 'real';
    }
  } catch {
    // Fallback below.
  }

  if (simulationInterval) clearInterval(simulationInterval);
  simulationInterval = setInterval(async () => {
    await recordActivityData();
  }, 60000);
  await AsyncStorage.setItem(SENSOR_MODE_KEY, 'simulated');
  return 'simulated';
}

export async function stopLiveSensorCapture(): Promise<void> {
  if (pedometerSub) {
    pedometerSub.remove();
    pedometerSub = null;
  }
  if (accelerometerSub) {
    accelerometerSub.remove();
    accelerometerSub = null;
  }
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
  lastPedometerCount = 0;
  await AsyncStorage.setItem(SENSOR_MODE_KEY, 'off');
}

// Habit integration
export function createSensorBasedHabits(): Omit<Habit, 'id' | 'startDate' | 'completedDates' | 'currentStreak' | 'longestStreak' | 'notes' | 'points' | 'isActive'>[] {
  return [
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
}