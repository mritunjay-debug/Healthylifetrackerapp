import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Button from './Button';

type PrimaryButtonProps = {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  iconName?: string;
};

export default function PrimaryButton({ onPress, children, style, iconName }: PrimaryButtonProps) {
  return (
    <Button onPress={onPress} variant="primary" style={style} iconName={iconName}>
      {children}
    </Button>
  );
}

