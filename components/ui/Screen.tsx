import React from 'react';
import { ScrollView, StyleProp, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export default function Screen({ children, scroll, style, contentStyle }: ScreenProps) {
  const { tokens } = useTheme();

  const containerStyle: StyleProp<ViewStyle> = [
    { flex: 1, backgroundColor: tokens.colors.background },
    style,
  ];

  if (scroll) {
    return (
      <SafeAreaView style={containerStyle}>
        <ScrollView contentContainerStyle={contentStyle}>{children}</ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyle}>
      <View style={contentStyle}>{children}</View>
    </SafeAreaView>
  );
}

