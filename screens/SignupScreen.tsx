import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import TextField from '../components/ui/TextField';
import PrimaryButton from '../components/ui/PrimaryButton';
import { isOnboarded } from '../lib/storage';

export default function SignupScreen() {
  const navigation = useNavigation<any>();
  const { tokens } = useTheme();
  const { signUp } = useAuth();
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
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    try {
      const { needsEmailConfirmation, message } = await signUp(e, password);
      if (needsEmailConfirmation) {
        Alert.alert(
          'Confirm your email',
          message || 'If you have email confirmation enabled, check your inbox.',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
        return;
      }
      const onboarded = await isOnboarded();
      navigation.reset({
        index: 0,
        routes: [{ name: onboarded ? 'Main' : 'Onboarding' }],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
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
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </TouchableOpacity>

        <View style={styles.header}>
          <Ionicons name="person-add-outline" size={48} color={c.primary} />
          <Text style={[styles.title, { color: c.text }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: c.mutedText }]}>
            Use the same email you use for your habit data backup.
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
            label="Password (8+ characters)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password-new"
            editable={!submitting}
          />

          {error ? (
            <Text style={[styles.error, { color: '#ef4444' }]}>{error}</Text>
          ) : null}

          <View style={{ height: 16 }} />
          <PrimaryButton onPress={onSubmit} iconName="checkmark-circle-outline">
            {submitting ? 'Creating…' : 'Sign up'}
          </PrimaryButton>
          {submitting ? (
            <ActivityIndicator style={{ marginTop: 12 }} color={c.primary} />
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.footer}
          onPress={() => navigation.navigate('Login')}
          disabled={submitting}
        >
          <Text style={[styles.footerText, { color: c.mutedText }]}>
            Already have an account?{' '}
            <Text style={{ color: c.primary, fontWeight: '800' }}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  back: { position: 'absolute', top: 8, left: 8, zIndex: 1, padding: 8 },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 16 },
  subtitle: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  form: { width: '100%' },
  error: { marginTop: 12, fontSize: 14, fontWeight: '600' },
  footer: { marginTop: 28, alignItems: 'center' },
  footerText: { fontSize: 15 },
});
