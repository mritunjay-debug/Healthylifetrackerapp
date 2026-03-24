import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import PrimaryButton from '../components/ui/PrimaryButton';
import { isOnboarded } from '../lib/storage';

export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const { tokens } = useTheme();
  const { continueAsGuest, signInWithGoogle } = useAuth();
  const c = tokens.colors;

  const onContinueGuest = async () => {
    await continueAsGuest();
    const onboarded = await isOnboarded();
    navigation.reset({
      index: 0,
      routes: [{ name: onboarded ? 'Main' : 'Onboarding' }],
    });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.container}>
        <Ionicons name="leaf-outline" size={56} color={c.primary} />
        <Text style={[styles.title, { color: c.text }]}>Welcome to StreakForge</Text>
        <Text style={[styles.subtitle, { color: c.mutedText }]}>
          Start using the app instantly. Account is optional.
        </Text>

        <View style={styles.actions}>
          <PrimaryButton onPress={onContinueGuest} iconName="play-outline">
            Continue without account
          </PrimaryButton>
          <View style={{ height: 12 }} />
          <PrimaryButton onPress={signInWithGoogle} iconName="logo-google">
            Continue with Google
          </PrimaryButton>
          <View style={{ height: 12 }} />
          <PrimaryButton onPress={() => navigation.navigate('Signup')} iconName="person-add-outline">
            Create account
          </PrimaryButton>
          <TouchableOpacity style={styles.signInLink} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.signInText, { color: c.primary }]}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 320,
  },
  actions: {
    width: '100%',
    marginTop: 28,
  },
  signInLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  signInText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
