import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { QuitProfile } from '../lib/types';
import { saveQuitProfile } from '../lib/storage';
import { getAppPreferences } from '../lib/appPreferences';

const steps = [
  {
    title: 'Welcome to Quit & Transform',
    subtitle: 'Your journey to freedom starts here',
    description: 'Track your smoke-free streak, manage cravings, and transform your health.',
    icon: 'leaf-outline',
  },
  {
    title: 'What are you quitting?',
    subtitle: 'Choose your path',
    description: 'Select what you want to quit to get personalized tracking.',
    icon: 'flame-outline',
  },
  {
    title: 'Your baseline',
    subtitle: 'Help us calculate your progress',
    description: 'Tell us about your current usage to show savings and avoided amounts.',
    icon: 'calculator-outline',
  },
  {
    title: 'Financial goals',
    subtitle: 'See your money grow',
    description: 'Set savings goals and watch your money pile up as you stay smoke-free.',
    icon: 'cash-outline',
  },
  {
    title: 'Health transformation',
    subtitle: 'Your body will thank you',
    description: 'Track amazing health improvements as you reclaim your life.',
    icon: 'heart-outline',
  },
];

const QUIT_ONBOARDING_DRAFT_KEY = '@quit_onboarding_draft_v1';

type QuitOnboardingDraft = {
  currentStep: number;
  quitType: 'smoking' | 'vaping';
  dailyAmount: string;
  costPerUnit: string;
  currency: string;
  nicotineStrength: string;
  weightGoal: string;
};

export default function QuitOnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(0);
  const [quitType, setQuitType] = useState<'smoking' | 'vaping'>('smoking');
  const [dailyAmount, setDailyAmount] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [currency, setCurrency] = useState('$');
  const [nicotineStrength, setNicotineStrength] = useState('');
  const [weightGoal, setWeightGoal] = useState('');
  const navigation = useNavigation<any>();
  const { isDark, tokens } = useTheme();
  const c = tokens.colors;

  useEffect(() => {
    getAppPreferences().then((prefs) => setCurrency(prefs.currencySymbol || '$'));
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(QUIT_ONBOARDING_DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw) as QuitOnboardingDraft;
          setCurrentStep(Math.max(0, Math.min(steps.length - 1, d.currentStep ?? 0)));
          setQuitType(d.quitType ?? 'smoking');
          setDailyAmount(d.dailyAmount ?? '');
          setCostPerUnit(d.costPerUnit ?? '');
          setCurrency(d.currency ?? '$');
          setNicotineStrength(d.nicotineStrength ?? '');
          setWeightGoal(d.weightGoal ?? '');
          return;
        }
      } catch {
        // ignore malformed draft
      }
      // First-time defaults.
      setCurrentStep(0);
      setQuitType('smoking');
      setDailyAmount('10');
      setCostPerUnit('5');
      setNicotineStrength('');
      setWeightGoal('');
    })();
  }, []);

  useEffect(() => {
    const draft: QuitOnboardingDraft = {
      currentStep,
      quitType,
      dailyAmount,
      costPerUnit,
      currency,
      nicotineStrength,
      weightGoal,
    };
    AsyncStorage.setItem(QUIT_ONBOARDING_DRAFT_KEY, JSON.stringify(draft)).catch(() => {
      // non-blocking
    });
  }, [currentStep, quitType, dailyAmount, costPerUnit, currency, nicotineStrength, weightGoal]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    const profile: QuitProfile = {
      id: 'main',
      startDate: new Date().toISOString(),
      dailyAmount: parseInt(dailyAmount) || 0,
      costPerUnit: parseFloat(costPerUnit) || 0,
      currency,
      nicotineStrength: nicotineStrength ? parseInt(nicotineStrength) : undefined,
      weightGoal: weightGoal ? parseFloat(weightGoal) : undefined,
      quitType,
    };

    await saveQuitProfile(profile);
    await AsyncStorage.removeItem(QUIT_ONBOARDING_DRAFT_KEY);
    // Quit tab lives inside Main tabs; navigate through parent route.
    navigation.navigate('Main', { screen: 'Quit' });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.typeSelection}>
            <TouchableOpacity
              style={[
                styles.typeOption,
                { backgroundColor: quitType === 'smoking' ? '#0D9488' : (isDark ? '#333' : '#f0f0f0') },
                { marginBottom: 20 },
              ]}
              onPress={() => setQuitType('smoking')}
            >
              <Ionicons name="flame" size={32} color={quitType === 'smoking' ? '#fff' : '#EF4444'} />
              <Text style={[styles.typeTitle, { color: quitType === 'smoking' ? '#fff' : (isDark ? '#fff' : '#000') }]}>Quit Smoking</Text>
              <Text style={[styles.typeDesc, { color: quitType === 'smoking' ? '#fff' : (isDark ? '#ccc' : '#666') }]}>
                Traditional cigarettes or cigars
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeOption, { backgroundColor: quitType === 'vaping' ? '#0D9488' : (isDark ? '#333' : '#f0f0f0') }]}
              onPress={() => setQuitType('vaping')}
            >
              <Ionicons name="cloud" size={32} color={quitType === 'vaping' ? '#fff' : '#6366F1'} />
              <Text style={[styles.typeTitle, { color: quitType === 'vaping' ? '#fff' : (isDark ? '#fff' : '#000') }]}>Quit Vaping</Text>
              <Text style={[styles.typeDesc, { color: quitType === 'vaping' ? '#fff' : (isDark ? '#ccc' : '#666') }]}>
                E-cigarettes and vaping devices
              </Text>
            </TouchableOpacity>
          </View>
        );
      case 2:
        return (
          <View style={styles.inputSection}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#fff' : '#000' }]}>
                Daily {quitType === 'smoking' ? 'cigarettes' : 'puffs'}
              </Text>
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#333' : '#f5f5f5' }]}
                value={dailyAmount}
                onChangeText={setDailyAmount}
                placeholder={`e.g., ${quitType === 'smoking' ? '20' : '200'}`}
                placeholderTextColor={isDark ? '#666' : '#ccc'}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#fff' : '#000' }]}>
                Cost per {quitType === 'smoking' ? 'pack (20)' : 'device/mL'}
              </Text>
              <View style={styles.currencyInput}>
                <TextInput
                  style={[styles.currencySymbol, { color: isDark ? '#fff' : '#000' }]}
                  value={currency}
                  onChangeText={setCurrency}
                  maxLength={3}
                />
                <TextInput
                  style={[styles.input, { flex: 1, color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#333' : '#f5f5f5' }]}
                  value={costPerUnit}
                  onChangeText={setCostPerUnit}
                  placeholder="e.g., 8.50"
                  placeholderTextColor={isDark ? '#666' : '#ccc'}
                  keyboardType="numeric"
                />
              </View>
            </View>
            {quitType === 'vaping' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: isDark ? '#fff' : '#000' }]}>Nicotine strength (mg/mL)</Text>
                <TextInput
                  style={[styles.input, { color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#333' : '#f5f5f5' }]}
                  value={nicotineStrength}
                  onChangeText={setNicotineStrength}
                  placeholder="e.g., 18"
                  placeholderTextColor={isDark ? '#666' : '#ccc'}
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>
        );
      case 3:
        return (
          <View style={styles.inputSection}>
            <Text style={[styles.sectionDesc, { color: isDark ? '#ccc' : '#666' }]}>
              Set a savings goal to motivate yourself. Watch your money grow!
            </Text>
            <Text style={[styles.note, { color: isDark ? '#aaa' : '#888' }]}>
              You can set specific goals later in the app.
            </Text>
          </View>
        );
      case 4:
        return (
          <View style={styles.inputSection}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: isDark ? '#fff' : '#000' }]}>Weight goal (optional)</Text>
              <TextInput
                style={[styles.input, { color: isDark ? '#fff' : '#000', backgroundColor: isDark ? '#333' : '#f5f5f5' }]}
                value={weightGoal}
                onChangeText={setWeightGoal}
                placeholder="e.g., 150 lbs or 68 kg"
                placeholderTextColor={isDark ? '#666' : '#ccc'}
                keyboardType="numeric"
              />
            </View>
            <Text style={[styles.sectionDesc, { color: isDark ? '#ccc' : '#666' }]}>
              Your body will begin healing immediately. Track the amazing changes!
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const step = steps[currentStep];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.stepIndicator, { color: c.mutedText }]}>
            {currentStep + 1} of {steps.length}
          </Text>
        </View>

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: c.surfaceElevated }]}>
            <Ionicons name={step.icon as any} size={60} color="#0D9488" />
          </View>
          <Text style={[styles.title, { color: c.text }]}>{step.title}</Text>
          <Text style={[styles.subtitle, { color: c.mutedText }]}>{step.subtitle}</Text>
          <Text style={[styles.description, { color: c.mutedText }]}>{step.description}</Text>

          {renderStepContent()}
        </View>

        <View style={styles.bottomContainer}>
          <View style={styles.dotsContainer}>
            {steps.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: index === currentStep ? '#0D9488' : c.border },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#0D9488' }]}
            onPress={handleNext}
          >
            <Text style={styles.buttonText}>
              {currentStep === steps.length - 1 ? 'Start My Journey' : 'Continue'}
            </Text>
          </TouchableOpacity>
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
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  stepIndicator: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  typeSelection: {
    width: '100%',
  },
  typeOption: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
  },
  typeDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  inputSection: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    padding: 15,
    paddingRight: 10,
    fontSize: 16,
    width: 50,
  },
  sectionDesc: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 20,
  },
  note: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomContainer: {
    paddingTop: 40,
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
  button: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});