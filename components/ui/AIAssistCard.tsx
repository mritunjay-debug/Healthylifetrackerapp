import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Card from './Card';

type AIAssistCardProps = {
  title: string;
  subtitle?: string;
  lines: string[];
  loading?: boolean;
  source?: 'external' | 'local-fallback' | null;
  onRefresh: () => void;
  onOpenFullScreen?: () => void;
  actions?: Array<{ label: string; onPress: () => void }>;
  colors: {
    text: string;
    mutedText: string;
    border: string;
    primary: string;
    accent: string;
  };
};

export default function AIAssistCard({
  title,
  subtitle,
  lines,
  loading,
  source,
  onRefresh,
  onOpenFullScreen,
  actions = [],
  colors,
}: AIAssistCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.left}>
          <Ionicons name="sparkles" size={16} color={colors.accent} />
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={styles.headerButtons}>
          {onOpenFullScreen ? (
            <TouchableOpacity style={[styles.openBtn, { borderColor: colors.border }]} onPress={onOpenFullScreen} activeOpacity={0.85}>
              <Ionicons name="open-outline" size={14} color={colors.text} />
              <Text style={[styles.openBtnText, { color: colors.text }]}>Full AI</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.refresh, { borderColor: colors.border }]} onPress={onRefresh} activeOpacity={0.85}>
            <Ionicons name="refresh" size={14} color={colors.primary} />
            <Text style={[styles.refreshText, { color: colors.primary }]}>{loading ? 'Loading' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedText }]}>{subtitle}</Text> : null}
      {source ? (
        <Text style={[styles.source, { color: colors.mutedText }]}>
          Source: {source === 'external' ? 'AI model' : 'Smart local coach'}
        </Text>
      ) : null}
      {lines.slice(0, 4).map((line, idx) => (
        <Text key={`${idx}-${line}`} style={[styles.line, { color: colors.text }]}>
          • {line}
        </Text>
      ))}
      {actions.length ? (
        <View style={styles.actions}>
          {actions.map((action) => (
            <TouchableOpacity key={action.label} onPress={action.onPress} style={[styles.actionPill, { borderColor: colors.border }]} activeOpacity={0.85}>
              <Text style={[styles.actionText, { color: colors.text }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, marginBottom: 14 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '800', marginLeft: 6 },
  subtitle: { marginTop: 6, fontSize: 12, fontWeight: '600' },
  source: { marginTop: 4, fontSize: 11, fontWeight: '700' },
  line: { marginTop: 8, fontSize: 12, fontWeight: '600', lineHeight: 18 },
  refresh: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  refreshText: { fontSize: 11, fontWeight: '800', marginLeft: 5 },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  openBtn: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  openBtnText: { fontSize: 11, fontWeight: '800', marginLeft: 5 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  actionPill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 8, marginBottom: 8 },
  actionText: { fontSize: 11, fontWeight: '700' },
});

