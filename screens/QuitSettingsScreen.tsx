import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { QuitProfile } from '../lib/types';
import { getQuitProfile, saveQuitProfile } from '../lib/storage';
import { getAppPreferences, saveAppPreferences } from '../lib/appPreferences';

export default function QuitSettingsScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();

  const [profile, setProfile] = useState<QuitProfile | null>(null);

  const [quitType, setQuitType] = useState<'smoking' | 'vaping'>('smoking');
  const [dailyAmount, setDailyAmount] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [currency, setCurrency] = useState('$');
  const [nicotineStrength, setNicotineStrength] = useState('');
  const [weightGoal, setWeightGoal] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const p = await getQuitProfile();
    const prefs = await getAppPreferences();
    setProfile(p);
    if (p) {
      setQuitType(p.quitType);
      setDailyAmount(String(p.dailyAmount ?? 0));
      setCostPerUnit(String(p.costPerUnit ?? 0));
      setCurrency(p.currency ?? '$');
      setNicotineStrength(p.nicotineStrength != null ? String(p.nicotineStrength) : '');
      setWeightGoal(p.weightGoal != null ? String(p.weightGoal) : '');
    } else {
      setCurrency(prefs.currencySymbol || '$');
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    const next: QuitProfile = {
      ...profile,
      quitType,
      dailyAmount: parseInt(dailyAmount) || 0,
      costPerUnit: parseFloat(costPerUnit) || 0,
      currency: currency || '$',
      nicotineStrength: nicotineStrength ? parseInt(nicotineStrength) : undefined,
      weightGoal: weightGoal ? parseFloat(weightGoal) : undefined,
    };

    await saveQuitProfile(next);
    const prefs = await getAppPreferences();
    await saveAppPreferences({ ...prefs, currencySymbol: next.currency });
    Alert.alert('Saved', 'Quit settings updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
  };

  if (!profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#000'} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Quit Settings</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={[styles.card, { backgroundColor: isDark ? '#111' : '#f5f5f5' }]}>
            <Ionicons name="leaf-outline" size={60} color="#0D9488" />
            <Text style={[styles.cardTitle, { color: isDark ? '#fff' : '#000' }]}>Set up your quit journey</Text>
            <Text style={[styles.cardDesc, { color: isDark ? '#ccc' : '#666' }]}>
              We need baseline info before we can calculate savings and milestones.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#0D9488' }]}
              onPress={() => navigation.navigate('QuitOnboarding' as never)}
            >
              <Text style={styles.primaryButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={isDark ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>Quit Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.card, { backgroundColor: isDark ? '#111' : '#f5f5f5' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#fff' : '#000' }]}>Choose your path</Text>

          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                {
                  backgroundColor: quitType === 'smoking' ? '#0D9488' : isDark ? '#222' : '#f0f0f0',
                  borderColor: quitType === 'smoking' ? '#0D9488' : isDark ? '#333' : '#ddd',
                },
              ]}
              onPress={() => setQuitType('smoking')}
            >
              <Ionicons name="flame" size={26} color={quitType === 'smoking' ? '#fff' : '#EF4444'} />
              <Text style={[styles.typeText, { color: quitType === 'smoking' ? '#fff' : (isDark ? '#fff' : '#000') }]}>
                Quit Smoking
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeOption,
                {
                  backgroundColor: quitType === 'vaping' ? '#0D9488' : isDark ? '#222' : '#f0f0f0',
                  borderColor: quitType === 'vaping' ? '#0D9488' : isDark ? '#333' : '#ddd',
                },
              ]}
              onPress={() => setQuitType('vaping')}
            >
              <Ionicons name="cloud" size={26} color={quitType === 'vaping' ? '#fff' : '#6366F1'} />
              <Text style={[styles.typeText, { color: quitType === 'vaping' ? '#fff' : (isDark ? '#fff' : '#000') }]}>
                Quit Vaping
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
              Daily {quitType === 'smoking' ? 'cigarettes' : 'puffs'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#222' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
              value={dailyAmount}
              onChangeText={setDailyAmount}
              keyboardType="numeric"
              placeholder="e.g., 20"
              placeholderTextColor={isDark ? '#666' : '#ccc'}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>
              Cost per {quitType === 'smoking' ? 'pack (20)' : 'device/mL'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#222' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
              value={costPerUnit}
              onChangeText={setCostPerUnit}
              keyboardType="numeric"
              placeholder="e.g., 8.50"
              placeholderTextColor={isDark ? '#666' : '#ccc'}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Currency</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#222' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
              value={currency}
              onChangeText={setCurrency}
              maxLength={4}
              placeholder="$"
              placeholderTextColor={isDark ? '#666' : '#ccc'}
            />
          </View>

          {quitType === 'vaping' && (
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Nicotine strength (mg/mL)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: isDark ? '#222' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
                value={nicotineStrength}
                onChangeText={setNicotineStrength}
                keyboardType="numeric"
                placeholder="e.g., 18"
                placeholderTextColor={isDark ? '#666' : '#ccc'}
              />
            </View>
          )}

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: isDark ? '#fff' : '#000' }]}>Weight goal (optional)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: isDark ? '#222' : '#f5f5f5', color: isDark ? '#fff' : '#000' }]}
              value={weightGoal}
              onChangeText={setWeightGoal}
              keyboardType="numeric"
              placeholder="e.g., 150 or 68"
              placeholderTextColor={isDark ? '#666' : '#ccc'}
            />
          </View>

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#0D9488' }]} onPress={handleSave}>
            <Text style={styles.primaryButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContent: { padding: 20, paddingBottom: 120 },
  card: { borderRadius: 16, padding: 18 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginTop: 14, marginBottom: 8, textAlign: 'center' },
  cardDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  primaryButton: { borderRadius: 25, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 12 },
  typeRow: { flexDirection: 'row' },
  typeOption: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  typeText: { marginTop: 8, fontWeight: '800', fontSize: 13 },
  formGroup: { marginTop: 14 },
  label: { fontWeight: '700', fontSize: 14, marginBottom: 8 },
  input: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#00000000' },
});

