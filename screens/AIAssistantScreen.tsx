import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { getDietCoachSuggestions } from '../lib/aiCoachApi';

type AiAssistantParams = {
  title?: string;
  subtitle?: string;
  context?: string;
  payloadSummary?: string;
  initialFocus?: string;
};

export default function AIAssistantScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params || {}) as AiAssistantParams;
  const { tokens } = useTheme();
  const c = tokens.colors;

  const [focus, setFocus] = useState(params.initialFocus?.trim() || 'Give me personalized guidance.');
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'external' | 'local-fallback' | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const context = params.context?.trim() || 'general';
  const payloadSummary = params.payloadSummary?.trim() || '';

  const headerTitle = params.title?.trim() || 'AI Assistant';
  const headerSubtitle = params.subtitle?.trim() || 'Full response mode';

  const runAi = async (requestedFocus?: string) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const query = (requestedFocus ?? focus).trim() || 'Give me personalized guidance.';
      const resp = await getDietCoachSuggestions({
        profile: {},
        logs: [],
        budget: 0,
        todayIntake: 0,
        context,
        focus: query,
        payloadSummary,
      });
      setLines(resp.suggestions);
      setSource(resp.source);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI request failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void runAi(params.initialFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context, payloadSummary]);

  const quickPrompts = useMemo(
    () => [
      'What should I focus on right now?',
      'Give me a simple 2-step plan for today.',
      'What is the biggest mistake to avoid today?',
      'Give me one fallback action if I miss my plan.',
    ],
    []
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.85}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>{headerTitle}</Text>
          <Text style={[styles.subtitle, { color: c.mutedText }]}>{headerSubtitle}</Text>
        </View>
      </View>

      <View style={[styles.queryWrap, { backgroundColor: c.surface }]}>
        <TextInput
          value={focus}
          onChangeText={setFocus}
          placeholder="Ask anything..."
          placeholderTextColor={c.mutedText}
          style={[styles.input, { color: c.text, backgroundColor: c.surfaceElevated }]}
          multiline
        />
        <TouchableOpacity
          style={[styles.askBtn, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={() => void runAi()}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Ionicons name="sparkles" size={14} color="#fff" />
          <Text style={styles.askBtnText}>{loading ? 'Thinking...' : 'Ask AI'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.promptRow}>
          {quickPrompts.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.promptPill, { borderColor: c.border }]}
              onPress={() => {
                setFocus(p);
                void runAi(p);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.promptText, { color: c.text }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={[styles.responseCard, { backgroundColor: c.surface }]}>
          <View style={styles.responseHeader}>
            <Text style={[styles.responseTitle, { color: c.text }]}>Full AI Response</Text>
            {source ? (
              <Text style={[styles.sourceText, { color: c.mutedText }]}>
                {source === 'external' ? 'Source: AI model' : 'Source: Smart local coach'}
              </Text>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
              <Text style={[styles.loadingText, { color: c.mutedText }]}>Generating detailed response...</Text>
            </View>
          ) : null}

          {errorMsg ? <Text style={[styles.errorText, { color: c.danger }]}>{errorMsg}</Text> : null}

          {!loading && !errorMsg && lines.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.mutedText }]}>No response yet. Ask something above.</Text>
          ) : null}

          {lines.map((line, idx) => (
            <Text key={`${idx}-${line}`} style={[styles.line, { color: c.text }]}>
              • {line}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backBtn: { padding: 6, marginRight: 8 },
  title: { fontSize: 18, fontWeight: '900' },
  subtitle: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  queryWrap: { marginHorizontal: 16, borderRadius: 14, padding: 12 },
  input: { minHeight: 72, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10, fontSize: 14, fontWeight: '600' },
  askBtn: { marginTop: 10, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  askBtnText: { color: '#fff', fontSize: 13, fontWeight: '800', marginLeft: 6 },
  scrollContent: { padding: 16, paddingBottom: 28 },
  promptRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 },
  promptPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, marginRight: 8, marginBottom: 8 },
  promptText: { fontSize: 11, fontWeight: '700' },
  responseCard: { borderRadius: 14, padding: 14 },
  responseHeader: { marginBottom: 8 },
  responseTitle: { fontSize: 15, fontWeight: '900' },
  sourceText: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  loadingText: { marginLeft: 8, fontSize: 12, fontWeight: '700' },
  errorText: { marginTop: 10, fontSize: 12, fontWeight: '700' },
  emptyText: { marginTop: 8, fontSize: 12, fontWeight: '700' },
  line: { marginTop: 9, fontSize: 14, lineHeight: 21, fontWeight: '600' },
});
