import React, { useEffect } from 'react';
import { DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type ShimmerSkeletonProps = {
  height?: number;
  width?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export default function ShimmerSkeleton({
  height = 16,
  width = '100%',
  radius = 10,
  style,
}: ShimmerSkeletonProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1200 }), -1, false);
  }, [progress]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(progress.value, [0, 1], [-120, 260], Extrapolation.CLAMP),
      },
      { skewX: '-20deg' as any },
    ],
  }));

  return (
    <View
      style={[
        styles.base,
        { height, width, borderRadius: radius },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, shimmerStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
  },
  shimmer: {
    position: 'absolute',
    left: 0,
    top: -30,
    width: 90,
    height: 120,
    backgroundColor: '#F8FAFCAA',
  },
});

