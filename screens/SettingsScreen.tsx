import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { AppPreferences, defaultPreferences, getAppPreferences, getUnitDefaultsByCountry, saveAppPreferences } from '../lib/appPreferences';
import { cancelDailyWisdomNotification, scheduleCategoryWisdomNotifications } from '../lib/dailyWisdom';
import {
  registerForPushNotifications,
  getStoredPushToken,
} from '../lib/pushNotifications';
import { requestAllSensorPermissions } from '../lib/sensorPermissions';
import { syncPushTokenToAccount } from '../lib/authApi';
import AIAssistCard from '../components/ui/AIAssistCard';
import { getDietCoachSuggestions } from '../lib/aiCoachApi';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { isDark, toggleTheme, tokens } = useTheme();
  const { user, session, signOut, guestMode, exitGuestMode } = useAuth();
  const c = tokens.colors;
  const [prefs, setPrefs] = useState<AppPreferences>(defaultPreferences);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'idle' | 'ok' | 'warn'>('idle');
  const [aiLines, setAiLines] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSource, setAiSource] = useState<'external' | 'local-fallback' | null>(null);

  useEffect(() => {
    getAppPreferences().then(setPrefs);
    getStoredPushToken().then(setPushToken);
    void refreshSettingsAi('Suggest best app settings for consistency and reminders.');
  }, []);

  const handleExport = () => {
    Alert.alert('Export Data', 'Data export feature coming soon!');
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy Policy',
      'Habit data is stored on your device. Your account email is used only for sign-in with your chosen backend.'
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'You can sign in again anytime.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
        },
      },
    ]);
  };

  const handleSignInFromGuest = async () => {
    await exitGuestMode();
    navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
  };

  const saveRegionalPrefs = async (next: AppPreferences) => {
    setPrefs(next);
    await saveAppPreferences(next);
    if (next.dailyWisdomEnabled) {
      await cancelDailyWisdomNotification();
      await scheduleCategoryWisdomNotifications({
        quitMorning: next.quitMorningTime,
        dietAfternoon: next.dietAfternoonTime,
        runningEvening: next.runningEveningTime,
      });
    }
  };

  const saveWisdomPrefs = async (enabled: boolean) => {
    const next = { ...prefs, dailyWisdomEnabled: enabled };
    setPrefs(next);
    await saveAppPreferences(next);
    if (enabled) {
      await scheduleCategoryWisdomNotifications({
        quitMorning: next.quitMorningTime,
        dietAfternoon: next.dietAfternoonTime,
        runningEvening: next.runningEveningTime,
      });
      Alert.alert('Enabled', 'Daily wisdom notifications are scheduled.');
    } else {
      await cancelDailyWisdomNotification();
      Alert.alert('Disabled', 'Daily wisdom notifications were turned off.');
    }
  };

  const saveWisdomTime = async (time: string) => {
    const next = { ...prefs, quitMorningTime: time };
    setPrefs(next);
    await saveAppPreferences(next);
    if (next.dailyWisdomEnabled) {
      await cancelDailyWisdomNotification();
      await scheduleCategoryWisdomNotifications({
        quitMorning: next.quitMorningTime,
        dietAfternoon: next.dietAfternoonTime,
        runningEvening: next.runningEveningTime,
      });
    }
  };

  const handleEnablePush = async () => {
    const res = await registerForPushNotifications();
    if (res.enabled && res.token) {
      setPushToken(res.token);
      if (session?.access_token) {
        try {
          await syncPushTokenToAccount(session.access_token, res.token);
        } catch {
          // non-blocking
        }
      }
      setPermissionStatus('ok');
      Alert.alert('Push enabled', 'Push token registered successfully.');
    } else {
      setPermissionStatus('warn');
      Alert.alert('Push not enabled', res.reason || 'Could not enable push notifications.');
    }
  };

  const handleAskAllPermissions = async () => {
    const sensor = await requestAllSensorPermissions();
    const push = await registerForPushNotifications();
    const ok = sensor.pedometer === 'granted' && push.enabled;
    setPermissionStatus(ok ? 'ok' : 'warn');
    Alert.alert(
      ok ? 'Permissions ready' : 'Some permissions missing',
      `Sensor: ${sensor.pedometer}\nPush: ${push.enabled ? 'granted' : 'denied'}`
    );
    if (push.token) setPushToken(push.token);
  };

  const refreshSettingsAi = async (focus: string) => {
    try {
      setAiLoading(true);
      const resp = await getDietCoachSuggestions({
        profile: {},
        logs: [],
        budget: 0,
        todayIntake: 0,
        context: 'settings',
        focus,
        payloadSummary: `darkMode=${isDark}, wisdom=${prefs.dailyWisdomEnabled}, country=${prefs.countryCode}, push=${Boolean(pushToken)}`,
      });
      setAiLines(resp.suggestions);
      setAiSource(resp.source);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Animated.Text entering={FadeInDown.duration(360)} style={[styles.title, { color: c.text }]}>Settings</Animated.Text>

        <Animated.View entering={FadeInUp.delay(80).duration(380)}>
          <AIAssistCard
            title="AI Settings Assistant"
            subtitle="Optimize reminders, permissions and routines."
            lines={aiLines}
            loading={aiLoading}
            source={aiSource}
            onRefresh={() => refreshSettingsAi('Refresh my best settings configuration for this week.')}
            onOpenFullScreen={() =>
              navigation.navigate('AIAssistant', {
                title: 'AI Settings Assistant',
                subtitle: 'Settings optimization in full-screen mode',
                context: 'settings',
                initialFocus: 'Suggest best app settings for consistency and reminders.',
                payloadSummary: `darkMode=${isDark}, wisdom=${prefs.dailyWisdomEnabled}, country=${prefs.countryCode}, push=${Boolean(pushToken)}`,
              })
            }
            actions={[
              { label: 'Focus reminders', onPress: () => refreshSettingsAi('How should I schedule reminder times?') },
              { label: 'Reduce noise', onPress: () => refreshSettingsAi('How to reduce notification fatigue?') },
            ]}
            colors={c}
          />
        </Animated.View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Account</Text>
          {guestMode ? (
            <>
              <View
                style={[
                  styles.settingItem,
                  { backgroundColor: c.surface, flexDirection: 'column', alignItems: 'stretch' },
                ]}
              >
                <Text style={[styles.settingText, { color: c.mutedText, marginBottom: 4 }]}>
                  Using the app without an account
                </Text>
                <Text style={[styles.settingText, { color: c.text }]}>
                  Habits stay on this device. Sign in anytime to link a cloud account.
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.settingItem, { backgroundColor: c.surface }]}
                onPress={handleSignInFromGuest}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="log-in-outline" size={24} color={c.primary} />
                  <Text style={[styles.settingText, { color: c.text }]}>Sign in</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.mutedText} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View
                style={[
                  styles.settingItem,
                  { backgroundColor: c.surface, flexDirection: 'column', alignItems: 'stretch' },
                ]}
              >
                <Text style={[styles.settingText, { color: c.mutedText, marginBottom: 4 }]}>Signed in as</Text>
                <Text style={[styles.settingText, { color: c.text, fontWeight: '700' }]}>
                  {user?.email ?? '—'}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.settingItem, { backgroundColor: c.surface }]}
                onPress={handleSignOut}
              >
                <View style={styles.settingLeft}>
                  <Ionicons name="log-out-outline" size={24} color={c.danger} />
                  <Text style={[styles.settingText, { color: c.danger }]}>Sign out</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.mutedText} />
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Permissions & Notifications</Text>
          <View
            style={[
              styles.settingItem,
              { backgroundColor: c.surface, flexDirection: 'column', alignItems: 'stretch' },
            ]}
          >
            <Text style={[styles.settingText, { color: c.text, marginLeft: 0, marginBottom: 6 }]}>
              Permission status:{' '}
              <Text style={{ color: permissionStatus === 'ok' ? c.success : permissionStatus === 'warn' ? c.danger : c.mutedText }}>
                {permissionStatus === 'ok' ? 'Ready' : permissionStatus === 'warn' ? 'Needs attention' : 'Not checked'}
              </Text>
            </Text>
            <Text style={[styles.settingText, { color: c.mutedText, marginLeft: 0 }]}>
              Push token: {pushToken ? `${pushToken.slice(0, 22)}...` : 'Not registered'}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: c.surface }]}
            onPress={handleAskAllPermissions}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color={c.primary} />
              <Text style={[styles.settingText, { color: c.text }]}>Ask all sensor + push permissions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.mutedText} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: c.surface }]}
            onPress={handleEnablePush}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color={c.info} />
              <Text style={[styles.settingText, { color: c.text }]}>Register push notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.mutedText} />
          </TouchableOpacity>

        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Appearance</Text>
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: c.surface }]}
            onPress={toggleTheme}
          >
            <View style={styles.settingLeft}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={24} color={c.accent} />
              <Text style={[styles.settingText, { color: c.text }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.mutedText} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Regional</Text>
          <View style={[styles.settingItem, { backgroundColor: c.surface, alignItems: 'flex-start' }]}>
            <View>
              <Text style={[styles.settingText, { color: c.text, marginLeft: 0 }]}>Country</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 }}>
                {(['IN', 'US', 'UK', 'CA', 'AU', 'OTHER'] as const).map((country) => (
                  <TouchableOpacity
                    key={country}
                    onPress={() => {
                      const currencyMap: Record<typeof country, string> = {
                        IN: '₹', US: '$', UK: '£', CA: 'C$', AU: 'A$', OTHER: prefs.currencySymbol || '₹',
                      };
                      const unitDefaults = getUnitDefaultsByCountry(country);
                      saveRegionalPrefs({
                        ...prefs,
                        countryCode: country,
                        currencySymbol: country === 'OTHER' ? currencyMap[country] : unitDefaults.currencySymbol,
                        weightUnit: unitDefaults.weightUnit,
                        distanceUnit: unitDefaults.distanceUnit,
                      });
                    }}
                    style={{
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      marginRight: 8,
                      marginBottom: 8,
                      backgroundColor: prefs.countryCode === country ? c.primary : c.surfaceElevated,
                    }}
                  >
                    <Text style={{ color: prefs.countryCode === country ? '#fff' : c.text, fontSize: 12, fontWeight: '700' }}>{country}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.settingText, { color: c.text, marginLeft: 0, marginTop: 8 }]}>Currency Symbol</Text>
              <TextInput
                value={prefs.currencySymbol}
                onChangeText={(value) => saveRegionalPrefs({ ...prefs, currencySymbol: value })}
                style={{
                  marginTop: 8,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  width: 120,
                  backgroundColor: c.surfaceElevated,
                  color: c.text,
                }}
                placeholder="₹"
                placeholderTextColor={c.mutedText}
                maxLength={4}
              />
              <Text style={[styles.settingText, { color: c.mutedText, marginLeft: 0, marginTop: 8 }]}>
                Units: {prefs.weightUnit} / {prefs.distanceUnit}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Daily Wisdom</Text>
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: c.surface }]}
            onPress={() => saveWisdomPrefs(!prefs.dailyWisdomEnabled)}
          >
            <View style={styles.settingLeft}>
              <Ionicons name={prefs.dailyWisdomEnabled ? 'notifications' : 'notifications-off'} size={24} color={c.accent} />
              <Text style={[styles.settingText, { color: c.text }]}>
                Daily Quotes & Healthy Habits
              </Text>
            </View>
            <Text style={{ color: prefs.dailyWisdomEnabled ? c.success : c.mutedText, fontWeight: '700' }}>
              {prefs.dailyWisdomEnabled ? 'ON' : 'OFF'}
            </Text>
          </TouchableOpacity>
          <View style={[styles.settingItem, { backgroundColor: c.surface }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="time" size={22} color={c.info} />
              <Text style={[styles.settingText, { color: c.text }]}>Quit Morning</Text>
            </View>
            <TextInput
              value={prefs.quitMorningTime}
              onChangeText={saveWisdomTime}
              style={{
                borderRadius: 8,
                paddingVertical: 6,
                paddingHorizontal: 8,
                width: 70,
                backgroundColor: c.surfaceElevated,
                color: c.text,
              }}
              placeholder="08:00"
              placeholderTextColor={c.mutedText}
              maxLength={5}
            />
          </View>
          <View style={[styles.settingItem, { backgroundColor: c.surface }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="restaurant" size={22} color={c.success} />
              <Text style={[styles.settingText, { color: c.text }]}>Diet Afternoon</Text>
            </View>
            <TextInput
              value={prefs.dietAfternoonTime}
              onChangeText={(value) => saveRegionalPrefs({ ...prefs, dietAfternoonTime: value })}
              style={{ borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, width: 70, backgroundColor: c.surfaceElevated, color: c.text }}
              placeholder="13:00"
              placeholderTextColor={c.mutedText}
              maxLength={5}
            />
          </View>
          <View style={[styles.settingItem, { backgroundColor: c.surface }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="walk" size={22} color={c.accent} />
              <Text style={[styles.settingText, { color: c.text }]}>Running Evening</Text>
            </View>
            <TextInput
              value={prefs.runningEveningTime}
              onChangeText={(value) => saveRegionalPrefs({ ...prefs, runningEveningTime: value })}
              style={{ borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, width: 70, backgroundColor: c.surfaceElevated, color: c.text }}
              placeholder="19:00"
              placeholderTextColor={c.mutedText}
              maxLength={5}
            />
          </View>
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: c.surface }]}
            onPress={() => navigation.navigate('WisdomManager')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="library" size={24} color={c.primary} />
              <Text style={[styles.settingText, { color: c.text }]}>Manage Quotes/Habits Library</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.mutedText} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Data</Text>
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: c.surface }]}
            onPress={handleExport}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="download" size={24} color={c.primary} />
              <Text style={[styles.settingText, { color: c.text }]}>Export Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.mutedText} />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>About</Text>
          <TouchableOpacity
            style={[styles.settingItem, { backgroundColor: c.surface }]}
            onPress={handlePrivacy}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-checkmark" size={24} color={c.success} />
              <Text style={[styles.settingText, { color: c.text }]}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.mutedText} />
          </TouchableOpacity>
          <View style={[styles.settingItem, { backgroundColor: c.surface }]}>
            <View style={styles.settingLeft}>
              <Ionicons name="information-circle" size={24} color={c.info} />
              <Text style={[styles.settingText, { color: c.text }]}>Version</Text>
            </View>
            <Text style={[styles.versionText, { color: c.mutedText }]}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 15,
  },
  versionText: {
    fontSize: 16,
    color: '#666',
  },
});