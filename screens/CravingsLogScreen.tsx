import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { CravingLog } from '../lib/types';
import { saveCravingLogs, getCravingLogs } from '../lib/storage';

const moodOptions = [
  { emoji: '😢', label: 'Terrible', value: 1 },
  { emoji: '😟', label: 'Bad', value: 2 },
  { emoji: '😐', label: 'Okay', value: 3 },
  { emoji: '🙂', label: 'Good', value: 4 },
  { emoji: '😊', label: 'Great', value: 5 },
];

const triggerOptions = [
  'Stress', 'Boredom', 'Coffee', 'Alcohol', 'Social', 'After Meal', 'Evening', 'Driving', 'Work Break', 'Phone',
];

const copingTips = [
  { tip: 'Take 10 deep breaths', icon: 'water' },
  { tip: 'Drink a glass of water', icon: 'water' },
  { tip: 'Go for a short walk', icon: 'walk' },
  { tip: 'Call a friend', icon: 'call' },
  { tip: 'Brush your teeth', icon: 'medical' },
  { tip: 'Do jumping jacks', icon: 'fitness' },
];

export default function CravingsLogScreen() {
  const [intensity, setIntensity] = useState(5);
  const [selectedMood, setSelectedMood] = useState(3);
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [copingStrategy, setCopingStrategy] = useState('');
  const [outcome, setOutcome] = useState<'resisted' | 'slipped' | 'gave_in'>('resisted');
  const [saving, setSaving] = useState(false);
  const navigation = useNavigation();
  const { tokens, isDark } = useTheme();
  const c = tokens.colors;

  const toggleTrigger = (trigger: string) => {
    if (selectedTriggers.includes(trigger)) {
      setSelectedTriggers(selectedTriggers.filter(t => t !== trigger));
    } else {
      setSelectedTriggers([...selectedTriggers, trigger]);
    }
  };

  const handleSave = async () => {
    if (saving) return;
    try {
      setSaving(true);
      const log: CravingLog = {
        id: `craving-${Date.now()}`,
        timestamp: new Date().toISOString(),
        intensity,
        triggers: selectedTriggers,
        mood: moodOptions.find(m => m.value === selectedMood)?.emoji || '😐',
        copingStrategy,
        outcome,
      };

      const existingLogs = await getCravingLogs();
      await saveCravingLogs([...existingLogs, log]);

      Alert.alert('Success', 'Craving logged successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Save failed', 'Could not save craving log. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={c.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.text }]}>Log Craving</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Intensity Slider */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            How intense was the craving?
          </Text>
          <View style={styles.intensityContainer}>
            <Text style={[styles.intensityLabel, { color: c.mutedText }]}>Mild</Text>
            <View style={styles.sliderContainer}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.sliderDot,
                    {
                      backgroundColor: level <= intensity ? c.danger : c.surfaceElevated,
                      transform: [{ scale: level === intensity ? 1.2 : 1 }],
                    },
                  ]}
                  onPress={() => setIntensity(level)}
                />
              ))}
            </View>
            <Text style={[styles.intensityLabel, { color: c.mutedText }]}>Extreme</Text>
          </View>
          <Text style={[styles.intensityValue, { color: c.danger }]}>Level {intensity}/10</Text>
        </View>

        {/* Mood Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            How are you feeling right now?
          </Text>
          <View style={styles.moodContainer}>
            {moodOptions.map((mood) => (
              <TouchableOpacity
                key={mood.value}
                style={[
                  styles.moodOption,
                  {
                    backgroundColor: selectedMood === mood.value ? '#0D9488' : c.surfaceElevated,
                    borderColor: selectedMood === mood.value ? '#0D9488' : c.border,
                  },
                ]}
                onPress={() => setSelectedMood(mood.value)}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[styles.moodLabel, {
                  color: selectedMood === mood.value ? '#fff' : c.text
                }]}>
                  {mood.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Triggers */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            What triggered this craving?
          </Text>
          <View style={styles.triggersContainer}>
            {triggerOptions.map((trigger) => (
              <TouchableOpacity
                key={trigger}
                style={[
                  styles.triggerChip,
                  {
                    backgroundColor: selectedTriggers.includes(trigger) ? '#F97316' : c.surfaceElevated,
                    borderColor: selectedTriggers.includes(trigger) ? '#F97316' : c.border,
                  },
                ]}
                onPress={() => toggleTrigger(trigger)}
              >
                <Text style={[styles.triggerText, {
                  color: selectedTriggers.includes(trigger) ? '#fff' : c.text
                }]}>
                  {trigger}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Coping Tips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            Try one of these coping strategies:
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tipsContainer}>
            {copingTips.map((tip, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.tipCard, { backgroundColor: c.surfaceElevated }]}
                onPress={() => setCopingStrategy(tip.tip)}
              >
                <Ionicons name={tip.icon as any} size={20} color="#0D9488" />
                <Text style={[styles.tipText, { color: c.text }]}>{tip.tip}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Outcome */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.text }]}>
            What happened?
          </Text>
          <View style={styles.outcomeContainer}>
            {[
              { key: 'resisted', label: 'Resisted!', color: '#10B981' },
              { key: 'slipped', label: 'Slipped but trying again', color: '#F97316' },
              { key: 'gave_in', label: 'Gave in', color: '#EF4444' },
            ].map((option, index) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.outcomeOption,
                  index > 0 ? { marginTop: 10 } : null,
                  {
                    backgroundColor: outcome === option.key ? option.color : c.surfaceElevated,
                    borderColor: outcome === option.key ? option.color : c.border,
                  },
                ]}
                onPress={() => setOutcome(option.key as any)}
              >
                <Text style={[styles.outcomeText, {
                  color: outcome === option.key ? '#fff' : c.text
                }]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: saving ? '#6B7280' : '#0D9488' }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Craving Log'}</Text>
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  intensityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  intensityLabel: {
    fontSize: 14,
    width: 40,
    textAlign: 'center',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
    marginHorizontal: 10,
  },
  sliderDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  intensityValue: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  moodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    flex: 1,
    marginHorizontal: 2,
  },
  moodEmoji: {
    fontSize: 24,
    marginBottom: 5,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  triggersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  triggerChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    margin: 4,
  },
  triggerText: {
    fontSize: 14,
  },
  tipsContainer: {
    marginTop: 10,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginRight: 10,
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tipText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  outcomeContainer: {
  },
  outcomeOption: {
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  outcomeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});