import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/ui/Card';
import { getCustomWisdomEntries, parseWisdomCsv, parseWisdomJson, saveCustomWisdomEntries, WisdomEntry } from '../lib/wisdomLibrary';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WisdomManagerScreen() {
  const { tokens } = useTheme();
  const c = tokens.colors;
  const [entries, setEntries] = useState<WisdomEntry[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    getCustomWisdomEntries().then(setEntries);
  }, []);

  const counts = useMemo(() => {
    return {
      total: entries.length,
      quit: entries.filter((e) => e.category === 'quit').length,
      running: entries.filter((e) => e.category === 'running').length,
      diet: entries.filter((e) => e.category === 'diet').length,
      general: entries.filter((e) => e.category === 'general').length,
    };
  }, [entries]);

  const saveParsed = async (parsed: WisdomEntry[]) => {
    if (parsed.length === 0) {
      Alert.alert('No valid entries', 'Could not parse any quote/habit items.');
      return;
    }
    const updated = [...entries, ...parsed];
    await saveCustomWisdomEntries(updated);
    setEntries(updated);
    Alert.alert('Imported', `${parsed.length} entries added.`);
  };

  const importJson = async () => {
    try {
      await saveParsed(parseWisdomJson(input));
      setInput('');
    } catch {
      Alert.alert('Invalid JSON', 'Please check JSON format.');
    }
  };

  const importCsv = async () => {
    await saveParsed(parseWisdomCsv(input));
    setInput('');
  };

  const clearCustom = async () => {
    await saveCustomWisdomEntries([]);
    setEntries([]);
    Alert.alert('Cleared', 'Custom wisdom entries removed.');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.text }]}>Wisdom Library Manager</Text>
        <Text style={[styles.sub, { color: c.mutedText }]}>
          Import 1000+ local custom quotes/habits via JSON or CSV.
        </Text>

        <Card style={styles.statsCard}>
          <Text style={[styles.statsText, { color: c.text }]}>Custom entries: {counts.total}</Text>
          <Text style={[styles.statsSub, { color: c.mutedText }]}>
            quit {counts.quit} · running {counts.running} · diet {counts.diet} · general {counts.general}
          </Text>
        </Card>

        <Card style={styles.importCard}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Paste JSON / CSV</Text>
          <TextInput
            multiline
            value={input}
            onChangeText={setInput}
            placeholder={`JSON: [{"category":"quit","text":"..."}]\nCSV: category,text`}
            placeholderTextColor={c.mutedText}
            style={[styles.textArea, { color: c.text, backgroundColor: c.surfaceElevated }]}
          />
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: c.primary }]} onPress={importJson}>
              <Ionicons name="code-slash" size={16} color="#fff" />
              <Text style={styles.btnText}>Import JSON</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, { backgroundColor: c.success }]} onPress={importCsv}>
              <Ionicons name="document-text" size={16} color="#fff" />
              <Text style={styles.btnText}>Import CSV</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.clearBtn, { borderColor: c.border }]} onPress={clearCustom}>
            <Text style={[styles.clearBtnText, { color: c.text }]}>Clear custom entries</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 120 },
  title: { fontSize: 22, fontWeight: '900' },
  sub: { fontSize: 13, marginTop: 4, marginBottom: 12, fontWeight: '600' },
  statsCard: { padding: 14, marginBottom: 12 },
  statsText: { fontSize: 16, fontWeight: '800' },
  statsSub: { fontSize: 12, marginTop: 4, fontWeight: '700' },
  importCard: { padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  textArea: { borderRadius: 10, minHeight: 160, padding: 10, textAlignVertical: 'top', fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '800', marginLeft: 6 },
  clearBtn: { marginTop: 10, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  clearBtnText: { fontSize: 12, fontWeight: '800' },
});

