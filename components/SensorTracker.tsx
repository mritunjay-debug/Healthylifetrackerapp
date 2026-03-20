import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getAppPreferences } from '../lib/appPreferences';
import {
  isTrackingEnabled,
  setTrackingEnabled,
  getActivityData,
  getSleepData,
  ActivityData,
  SleepData,
  isRunningSessionActive,
  startRunningSession,
  stopRunningSession,
  getSleepScheduleHour,
  setSleepScheduleHour,
  logSleepSessionAtHour,
  startLiveSensorCapture,
  stopLiveSensorCapture,
  getSensorMode,
} from '../lib/sensorTracking';

interface SensorTrackerProps {
  onDataUpdate?: () => void;
}

export default function SensorTracker({ onDataUpdate }: SensorTrackerProps) {
  const [trackingEnabled, setTrackingEnabledState] = useState(false);
  const [runningActive, setRunningActive] = useState(false);
  const [sleepHour, setSleepHour] = useState(22);
  const [sensorMode, setSensorMode] = useState<'real' | 'simulated' | 'off'>('off');
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [sleepData, setSleepData] = useState<SleepData | null>(null);
  const [distanceUnit, setDistanceUnit] = useState<'km' | 'mi'>('km');
  const { tokens } = useTheme();
  const c = tokens.colors;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const enabled = await isTrackingEnabled();
    setTrackingEnabledState(enabled);
    setRunningActive(await isRunningSessionActive());
    setSleepHour(await getSleepScheduleHour());
    setSensorMode(await getSensorMode());
    const prefs = await getAppPreferences();
    setDistanceUnit(prefs.distanceUnit);

    if (enabled) {
      const activities = await getActivityData();
      const today = new Date().toISOString().split('T')[0];
      const todayActivity = activities.find(a => a.date === today);
      setActivityData(todayActivity || null);

      const sleeps = await getSleepData();
      const lastSleep = sleeps[sleeps.length - 1];
      setSleepData(lastSleep || null);
    }
  };

  const toggleTracking = async () => {
    if (!trackingEnabled) {
      Alert.alert(
        'Enable Sensor Tracking',
        'This will use your device sensors to track sleep and activity. Data stays local on your device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              await setTrackingEnabled(true);
              setTrackingEnabledState(true);
              const mode = await startLiveSensorCapture();
              setSensorMode(mode);
              Alert.alert('Success', 'Sensor tracking enabled!');
              loadData();
              onDataUpdate?.();
            },
          },
        ]
      );
    } else {
      await setTrackingEnabled(false);
      await stopRunningSession();
      await stopLiveSensorCapture();
      setTrackingEnabledState(false);
      setRunningActive(false);
      setSensorMode('off');
      setActivityData(null);
      setSleepData(null);
      onDataUpdate?.();
    }
  };

  const toggleRunning = async () => {
    if (!trackingEnabled) {
      Alert.alert('Enable tracking first', 'Turn ON sensor tracking to start running mode.');
      return;
    }
    if (!runningActive) {
      await startRunningSession();
      const mode = await startLiveSensorCapture();
      setSensorMode(mode);
      setRunningActive(true);
      Alert.alert('Running started', 'Live running session is now tracking activity.');
    } else {
      await stopRunningSession();
      setRunningActive(false);
      Alert.alert('Running stopped', 'Session ended and activity was saved.');
      await loadData();
      onDataUpdate?.();
    }
  };

  const adjustSleepHour = async (delta: number) => {
    const next = Math.max(0, Math.min(23, sleepHour + delta));
    setSleepHour(next);
    await setSleepScheduleHour(next);
  };

  const logSleepNow = async () => {
    if (!trackingEnabled) {
      Alert.alert('Enable tracking first', 'Turn ON sensor tracking to log sleep.');
      return;
    }
    await logSleepSessionAtHour(sleepHour);
    await loadData();
    onDataUpdate?.();
    Alert.alert('Sleep logged', `Sleep session saved using bedtime ${sleepHour.toString().padStart(2, '0')}:00.`);
  };

  const getSleepQualityEmoji = (quality: number) => {
    if (quality >= 4) return '😴';
    if (quality >= 3) return '🙂';
    if (quality >= 2) return '😐';
    return '😟';
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (meters: number) => {
    if (distanceUnit === 'mi') {
      return `${(meters / 1609.34).toFixed(1)}mi`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons
            name="hardware-chip"
            size={24}
            color={trackingEnabled ? c.primary : c.mutedText}
          />
          <Text style={[styles.title, { color: c.text }]}>
            Sensor Tracking
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.toggleButton, { backgroundColor: trackingEnabled ? c.primary : c.border }]}
          onPress={toggleTracking}
        >
          <Text style={[styles.toggleText, { color: trackingEnabled ? '#fff' : c.mutedText }]}>
            {trackingEnabled ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>
      {trackingEnabled ? (
        <Text style={[styles.modeText, { color: c.mutedText }]}>
          Mode: {sensorMode === 'real' ? 'Real Sensors' : 'Simulated (sensor unavailable/permission denied)'}
        </Text>
      ) : null}

      {trackingEnabled && (
        <View style={styles.dataContainer}>
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: runningActive ? c.danger : c.success }]}
              onPress={toggleRunning}
              activeOpacity={0.85}
            >
              <Ionicons name={runningActive ? 'stop' : 'play'} size={16} color="#fff" />
              <Text style={styles.controlBtnText}>{runningActive ? 'Stop Run' : 'Start Run'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: c.info, marginRight: 0 }]}
              onPress={logSleepNow}
              activeOpacity={0.85}
            >
              <Ionicons name="moon" size={16} color="#fff" />
              <Text style={styles.controlBtnText}>Log Sleep</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sleepScheduleRow}>
            <Text style={[styles.scheduleLabel, { color: c.mutedText }]}>Sleep schedule:</Text>
            <TouchableOpacity style={[styles.scheduleAdjust, { borderColor: c.border }]} onPress={() => adjustSleepHour(-1)}>
              <Ionicons name="remove" size={16} color={c.text} />
            </TouchableOpacity>
            <Text style={[styles.scheduleHour, { color: c.text }]}>{sleepHour.toString().padStart(2, '0')}:00</Text>
            <TouchableOpacity style={[styles.scheduleAdjust, { borderColor: c.border }]} onPress={() => adjustSleepHour(1)}>
              <Ionicons name="add" size={16} color={c.text} />
            </TouchableOpacity>
          </View>

          {activityData && (
            <View style={styles.dataSection}>
              <View style={styles.dataHeader}>
                <Ionicons name="walk" size={20} color="#10B981" />
                <Text style={[styles.dataTitle, { color: c.text }]}>Today's Activity</Text>
              </View>
              <View style={styles.dataGrid}>
                <View style={styles.dataItem}>
                  <Text style={[styles.dataValue, { color: '#10B981' }]}>{activityData.steps.toLocaleString()}</Text>
                  <Text style={[styles.dataLabel, { color: c.mutedText }]}>Steps</Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={[styles.dataValue, { color: '#F97316' }]}>{formatDistance(activityData.distance)}</Text>
                  <Text style={[styles.dataLabel, { color: c.mutedText }]}>Distance</Text>
                </View>
                <View style={styles.dataItem}>
                  <Text style={[styles.dataValue, { color: '#EF4444' }]}>{activityData.calories}</Text>
                  <Text style={[styles.dataLabel, { color: c.mutedText }]}>Calories</Text>
                </View>
              </View>
            </View>
          )}

          {sleepData && (
            <View style={styles.dataSection}>
              <View style={styles.dataHeader}>
                <Ionicons name="moon" size={20} color="#6366F1" />
                <Text style={[styles.dataTitle, { color: c.text }]}>Last Night's Sleep</Text>
              </View>
              <View style={styles.sleepData}>
                <View style={styles.sleepMain}>
                  <Text style={styles.sleepEmoji}>{getSleepQualityEmoji(sleepData.quality)}</Text>
                  <View>
                    <Text style={[styles.sleepDuration, { color: c.text }]}>
                      {formatDuration(sleepData.duration)}
                    </Text>
                    <Text style={[styles.sleepQuality, { color: c.mutedText }]}>
                      Quality: {sleepData.quality}/5
                    </Text>
                  </View>
                </View>
                {sleepData.interruptions > 0 && (
                  <Text style={[styles.sleepInterruptions, { color: '#F59E0B' }]}>
                    {sleepData.interruptions} interruptions
                  </Text>
                )}
              </View>
            </View>
          )}

          {!activityData && !sleepData && (
            <View style={styles.emptyState}>
              <Ionicons name="analytics" size={48} color={c.mutedText} />
              <Text style={[styles.emptyText, { color: c.mutedText }]}>
                Collecting sensor data...
              </Text>
              <Text style={[styles.emptySubtext, { color: c.mutedText }]}>
                Data will appear here soon
              </Text>
            </View>
          )}
        </View>
      )}

      {!trackingEnabled && (
        <View style={styles.disabledState}>
          <Text style={[styles.disabledText, { color: c.mutedText }]}>
            Enable sensor tracking to automatically monitor your sleep and activity
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dataContainer: {
    padding: 16,
    paddingTop: 0,
  },
  dataSection: {
    marginBottom: 20,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    marginRight: 8,
  },
  controlBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },
  sleepScheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  scheduleLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 8,
  },
  scheduleAdjust: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleHour: {
    width: 56,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
  },
  dataHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  dataGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dataItem: {
    alignItems: 'center',
    flex: 1,
  },
  dataValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  dataLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  sleepData: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  sleepMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sleepEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  sleepDuration: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  sleepQuality: {
    fontSize: 14,
    marginTop: 4,
  },
  sleepInterruptions: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
  },
  disabledState: {
    padding: 16,
    paddingTop: 0,
  },
  disabledText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});