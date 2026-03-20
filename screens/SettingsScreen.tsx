import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { AppPreferences, defaultPreferences, getAppPreferences, getUnitDefaultsByCountry, saveAppPreferences } from '../lib/appPreferences';
import { cancelDailyWisdomNotification, scheduleCategoryWisdomNotifications } from '../lib/dailyWisdom';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { isDark, toggleTheme, tokens } = useTheme();
  const c = tokens.colors;
  const [prefs, setPrefs] = useState<AppPreferences>(defaultPreferences);

  useEffect(() => {
    getAppPreferences().then(setPrefs);
  }, []);

  const handleExport = () => {
    Alert.alert('Export Data', 'Data export feature coming soon!');
  };

  const handlePremium = () => {
    Alert.alert('Premium Features', 'Unlock unlimited habits, custom themes, and advanced analytics for $3.99!');
  };

  const handlePrivacy = () => {
    Alert.alert(
      'Privacy Policy',
      'StreakForge is 100% offline. Your data never leaves your device. We don\'t collect any personal information.'
    );
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={[styles.title, { color: c.text }]}>Settings</Text>

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
          <Text style={[styles.sectionTitle, { color: c.text }]}>Premium</Text>
          <View style={[styles.premiumCard, { backgroundColor: c.surface }]}>
            <View style={styles.premiumHeader}>
              <Ionicons name="star" size={24} color={c.accent} />
              <Text style={[styles.premiumTitle, { color: c.text }]}>StreakForge Premium</Text>
            </View>
            <Text style={[styles.premiumDescription, { color: c.mutedText }]}>
              Unlock unlimited habits, custom themes, advanced analytics, and priority support.
            </Text>
            <TouchableOpacity style={styles.premiumButton} onPress={handlePremium}>
              <Text style={styles.premiumButtonText}>Get Premium - $3.99</Text>
            </TouchableOpacity>
          </View>
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
  premiumCard: {
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  premiumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  premiumTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  premiumDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  premiumButton: {
    backgroundColor: '#F97316',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  premiumButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});