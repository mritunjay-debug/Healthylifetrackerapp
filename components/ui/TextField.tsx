import React from 'react';
import { StyleProp, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

type TextFieldProps = TextInputProps & {
  label?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
};

export default function TextField({ label, containerStyle, inputStyle, style, ...props }: TextFieldProps) {
  const { tokens } = useTheme();

  return (
    <View style={containerStyle}>
      {label ? <Text style={{ color: tokens.colors.mutedText, marginBottom: 8, fontSize: 13, fontWeight: '800' }}>{label}</Text> : null}
      <TextInput
        {...props}
        style={[
          {
            backgroundColor: tokens.colors.surfaceElevated,
            color: tokens.colors.text,
            borderWidth: 1,
            borderColor: tokens.colors.border,
            borderRadius: tokens.radius.md,
            paddingVertical: 12,
            paddingHorizontal: 14,
            fontSize: 15,
            fontWeight: '700',
          },
          style,
          inputStyle,
        ]}
      />
    </View>
  );
}

