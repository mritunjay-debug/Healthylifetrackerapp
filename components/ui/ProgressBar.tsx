import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type ProgressBarProps = {
  value: number; // 0..1
  height?: number;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export default function ProgressBar({ value, height = 10, label, style }: ProgressBarProps) {
  const { tokens } = useTheme();
  const pct = Math.max(0, Math.min(1, value)) * 100;

  return (
    <View style={style}>
      {label ? <Text style={{ color: tokens.colors.mutedText, fontSize: 13, fontWeight: '800', marginBottom: 8 }}>{label}</Text> : null}
      <View style={{ height, borderRadius: tokens.radius.pill, backgroundColor: tokens.colors.border, overflow: 'hidden' }}>
        <View style={{ height, width: `${pct}%`, borderRadius: tokens.radius.pill, backgroundColor: tokens.colors.primary }} />
      </View>
    </View>
  );
}

