import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import TextField from '../components/ui/TextField';
import PrimaryButton from '../components/ui/PrimaryButton';
import { isOnboarded } from '../lib/storage';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { tokens } = useTheme();
  const { signIn, continueAsGuest } = useAuth();
  const c = tokens.colors;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const e = email.trim();
    if (!e || !password) {
      setError('Enter email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await signIn(e, password);
      const onboarded = await isOnboarded();
      navigation.reset({
        index: 0,
        routes: [{ name: onboarded ? 'Main' : 'Onboarding' }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  };

  const onContinueWithoutAccount = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await continueAsGuest();
      const onboarded = await isOnboarded();
      navigation.reset({
        index: 0,
        routes: [{ name: onboarded ? 'Main' : 'Onboarding' }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not continue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.header}>
          <Ionicons name="lock-closed-outline" size={48} color={c.primary} />
          <Text style={[styles.title, { color: c.text }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: c.mutedText }]}>
            Sign in to sync your account, or continue with habits stored only on this device.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!submitting}
          />
          <View style={{ height: 16 }} />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            editable={!submitting}
          />

          {error ? (
            <Text style={[styles.error, { color: '#ef4444' }]}>{error}</Text>
          ) : null}

          <View style={{ height: 16 }} />
          <PrimaryButton onPress={onSubmit} iconName="log-in-outline">
            {submitting ? 'Signing in…' : 'Sign in'}
          </PrimaryButton>
          {submitting ? (
            <ActivityIndicator style={{ marginTop: 12 }} color={c.primary} />
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.skip, { borderColor: c.border }]}
          onPress={onContinueWithoutAccount}
          disabled={submitting}
        >
          <Text style={[styles.skipText, { color: c.text }]}>Continue without an account</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footer}
          onPress={() => navigation.navigate('Signup')}
          disabled={submitting}
        >
          <Text style={[styles.footerText, { color: c.mutedText }]}>
            No account?{' '}
            <Text style={{ color: c.primary, fontWeight: '800' }}>Create one</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 16 },
  subtitle: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  form: { width: '100%' },
  error: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  skip: {
    marginTop: 20,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipText: { fontSize: 15, fontWeight: '700' },
  footer: { marginTop: 20, alignItems: 'center' },
  footerText: { fontSize: 15 },
});
