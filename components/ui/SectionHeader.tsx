import React from 'react';
import { StyleProp, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
};

export default function SectionHeader({ title, subtitle, style }: SectionHeaderProps) {
  const { tokens } = useTheme();
  return (
    <View style={style}>
      <Text style={{ color: tokens.colors.text, fontSize: 18, fontWeight: '900' }}>{title}</Text>
      {subtitle ? <Text style={{ color: tokens.colors.mutedText, marginTop: 6, fontSize: 13, fontWeight: '700' }}>{subtitle}</Text> : null}
    </View>
  );
}

