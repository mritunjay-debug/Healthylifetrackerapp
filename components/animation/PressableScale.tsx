import React from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

type PressableScaleProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

export default function PressableScale({
  children,
  onPress,
  style,
  pressedScale = 0.97,
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withTiming(pressedScale, {
          duration: 110,
          easing: Easing.out(Easing.quad),
        });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, {
          damping: 14,
          stiffness: 240,
          mass: 0.7,
        });
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}

