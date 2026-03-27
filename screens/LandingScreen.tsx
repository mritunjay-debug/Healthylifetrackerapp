import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { isOnboarded } from '../lib/storage';
import GradientFill from '../components/ui/GradientFill';
import Card from '../components/ui/Card';
import PressableScale from '../components/animation/PressableScale';
import Animated, {
  Easing,
  Extrapolation,
  FadeInUp,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export default function LandingScreen() {
  const navigation = useNavigation<any>();
  const { tokens } = useTheme();
  const { continueAsGuest, signInWithGoogle } = useAuth();
  const c = tokens.colors;

  const scrollY = useSharedValue(0);
  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.95);
  const heroFloat = useSharedValue(0);
  const meshGlow = useSharedValue(0);
  const blobDrift = useSharedValue(0);
  const ctaPulse = useSharedValue(0);
  const cta1Y = useSharedValue(30);
  const cta2Y = useSharedValue(30);
  const cta3Y = useSharedValue(30);
  const cta1Opacity = useSharedValue(0);
  const cta2Opacity = useSharedValue(0);
  const cta3Opacity = useSharedValue(0);

  useEffect(() => {
    heroOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    heroScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });

    heroFloat.value = withRepeat(
      withSequence(withTiming(1, { duration: 1500 }), withTiming(0, { duration: 1500 })),
      -1,
      false
    );
    meshGlow.value = withRepeat(
      withSequence(withTiming(1, { duration: 2800 }), withTiming(0, { duration: 2800 })),
      -1,
      false
    );
    blobDrift.value = withRepeat(
      withSequence(withTiming(1, { duration: 2400 }), withTiming(0, { duration: 2400 })),
      -1,
      false
    );
    ctaPulse.value = withRepeat(
      withSequence(
        withDelay(4200, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) })),
        withTiming(0, { duration: 380, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      false
    );

    cta1Opacity.value = withDelay(650, withTiming(1, { duration: 220 }));
    cta2Opacity.value = withDelay(780, withTiming(1, { duration: 220 }));
    cta3Opacity.value = withDelay(910, withTiming(1, { duration: 220 }));
    cta1Y.value = withDelay(650, withSpring(0, { damping: 12, stiffness: 180, mass: 0.85 }));
    cta2Y.value = withDelay(780, withSpring(0, { damping: 12, stiffness: 180, mass: 0.85 }));
    cta3Y.value = withDelay(910, withSpring(0, { damping: 12, stiffness: 180, mass: 0.85 }));
  }, []);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [
      { scale: heroScale.value },
      { translateY: interpolate(scrollY.value, [0, 240], [0, -26], Extrapolation.CLAMP) },
    ],
  }));
  const heroForegroundParallax = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, 240], [0, -10], Extrapolation.CLAMP) }],
  }));
  const heroGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(meshGlow.value, [0, 1], [0.18, 0.38]),
    transform: [{ scale: interpolate(meshGlow.value, [0, 1], [0.96, 1.06]) }],
  }));
  const idleFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(heroFloat.value, [0, 1], [0, -5]) }],
  }));
  const blobTopStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(blobDrift.value, [0, 1], [0, 18]) },
      { translateY: interpolate(blobDrift.value, [0, 1], [0, -10]) },
      { translateY: interpolate(scrollY.value, [0, 400], [0, -20], Extrapolation.CLAMP) },
    ],
  }));
  const blobMidStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(blobDrift.value, [0, 1], [0, -14]) },
      { translateY: interpolate(blobDrift.value, [0, 1], [0, 8]) },
      { translateY: interpolate(scrollY.value, [0, 500], [0, -36], Extrapolation.CLAMP) },
    ],
  }));
  const cta1Style = useAnimatedStyle(() => ({
    opacity: cta1Opacity.value,
    transform: [{ translateY: cta1Y.value }],
  }));
  const cta2Style = useAnimatedStyle(() => ({
    opacity: cta2Opacity.value,
    transform: [{ translateY: cta2Y.value }],
  }));
  const cta3Style = useAnimatedStyle(() => ({
    opacity: cta3Opacity.value,
    transform: [{ translateY: cta3Y.value }],
    shadowOpacity: interpolate(ctaPulse.value, [0, 1], [0.2, 0.42]),
    shadowRadius: interpolate(ctaPulse.value, [0, 1], [10, 18]),
  }));

  const onContinueGuest = async () => {
    await continueAsGuest();
    const onboarded = await isOnboarded();
    navigation.reset({
      index: 0,
      routes: [{ name: onboarded ? 'Main' : 'Onboarding' }],
    });
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.bgLayer}>
        <Image
          source={require('../public/landing-hero-mesh.png')}
          style={styles.bgImage}
          resizeMode="cover"
        />
        <GradientFill colors={['#FFFFFF7A', '#FFF8EFB0']} style={StyleSheet.absoluteFillObject} opacity={1} />
        <Animated.View style={[styles.blob, styles.blobTop, { backgroundColor: '#0EA5E930' }, blobTopStyle]} />
        <Animated.View style={[styles.blob, styles.blobMid, { backgroundColor: '#F9731630' }, blobMidStyle]} />
        <View style={[styles.blob, styles.blobBottom, { backgroundColor: '#22C55E26' }]} />
      </View>

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.hero, heroStyle]}>
          <GradientFill colors={[c.primary, c.accent]} style={StyleSheet.absoluteFillObject} opacity={0.98} />
          <Animated.View style={[styles.heroGlow, heroGlowStyle]} />
          <Animated.View style={heroForegroundParallax}>
            <View style={styles.heroTop}>
              <View style={styles.heroBadge}>
                <Ionicons name="sparkles" size={14} color="#fff" />
                <Text style={styles.heroBadgeText}>AI Health Coach</Text>
              </View>
              <Animated.View style={[styles.heroBrain, idleFloatStyle]}>
                <Ionicons name="hardware-chip-outline" size={19} color="#fff" />
              </Animated.View>
            </View>
            <Text style={styles.heroTitle}>HealthTrack AI</Text>
            <Text style={styles.heroSubtitle}>Daily discipline. Better food choices. Better you.</Text>
            <View style={styles.heroStats}>
              <Animated.View style={[styles.heroStatChip, idleFloatStyle]}>
                <Ionicons name="flame" size={14} color="#fff" />
                <Text style={styles.heroStatText}>Streak Engine</Text>
              </Animated.View>
              <Animated.View style={[styles.heroStatChip, idleFloatStyle]}>
                <Ionicons name="restaurant" size={14} color="#fff" />
                <Text style={styles.heroStatText}>Diet AI</Text>
              </Animated.View>
              <Animated.View style={[styles.heroStatChip, idleFloatStyle]}>
                <Ionicons name="bar-chart" size={14} color="#fff" />
                <Text style={styles.heroStatText}>Deep Stats</Text>
              </Animated.View>
            </View>
          </Animated.View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.delay(80).duration(380)}
        >
          <Animated.View style={styles.card3dTilt}>
            <PressableScale style={styles.pressWrap}>
              <Card style={[styles.hookStrip, { backgroundColor: c.surface }]}>
                <Text style={[styles.hookTitle, { color: c.text }]}>No motivation? Start tiny.</Text>
                <Text style={[styles.hookLine, { color: c.mutedText }]}>One AI action, right now.</Text>
              </Card>
            </PressableScale>
          </Animated.View>
        </Animated.View>

        <View style={styles.visualRow}>
          <Animated.View
            entering={FadeInUp.delay(170).duration(380)}
            style={styles.visualPressWrap}
          >
            <Animated.View style={styles.card3dTilt}>
              <PressableScale>
                <Card style={[styles.visualCard, { backgroundColor: c.surface }]}>
                  <Animated.View style={idleFloatStyle}>
                    <Ionicons name="pulse" size={22} color={c.primary} />
                  </Animated.View>
                  <Text style={[styles.visualTitle, { color: c.text }]}>Track hard. Improve fast.</Text>
                  <Text style={[styles.visualText, { color: c.mutedText }]}>Streaks + stats, one place.</Text>
                </Card>
              </PressableScale>
            </Animated.View>
          </Animated.View>
          <Animated.View
            entering={FadeInUp.delay(300).duration(380)}
            style={styles.visualPressWrap}
          >
            <Animated.View style={styles.card3dTilt}>
              <PressableScale>
                <Card style={[styles.visualCard, { backgroundColor: c.surface }]}>
                  <Animated.View style={idleFloatStyle}>
                    <Ionicons name="nutrition" size={22} color={c.accent} />
                  </Animated.View>
                  <Text style={[styles.visualTitle, { color: c.text }]}>Eat smart daily.</Text>
                  <Text style={[styles.visualText, { color: c.mutedText }]}>Simple AI meal swaps.</Text>
                </Card>
              </PressableScale>
            </Animated.View>
          </Animated.View>
        </View>

        <Animated.View
          entering={FadeInUp.delay(390).duration(380)}
        >
          <Animated.View style={styles.card3dTilt}>
            <PressableScale style={styles.pressWrap}>
              <View style={[styles.featureCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                <Text style={[styles.featureTitle, { color: c.text }]}>What you get</Text>
                <Text style={[styles.featureItem, { color: c.mutedText }]}>• Habit streak tracking</Text>
                <Text style={[styles.featureItem, { color: c.mutedText }]}>• AI coaching on every main screen</Text>
                <Text style={[styles.featureItem, { color: c.mutedText }]}>• Diet, quit and progress guidance</Text>
              </View>
            </PressableScale>
          </Animated.View>
        </Animated.View>

        <View style={styles.actions}>
          <Animated.View style={cta1Style}>
            <PressableScale onPress={onContinueGuest} style={[styles.ctaButton, { backgroundColor: '#19A8E9' }]}>
              <Ionicons name="play-outline" size={18} color="#fff" />
              <Text style={styles.ctaText}>Continue without account</Text>
            </PressableScale>
          </Animated.View>
          <View style={{ height: 12 }} />
          <Animated.View style={cta2Style}>
            <PressableScale onPress={signInWithGoogle} style={[styles.ctaButton, { backgroundColor: '#19A8E9' }]}>
              <Ionicons name="logo-google" size={18} color="#fff" />
              <Text style={styles.ctaText}>Continue with Google</Text>
            </PressableScale>
          </Animated.View>
          <View style={{ height: 12 }} />
          <Animated.View style={cta3Style}>
            <PressableScale onPress={() => navigation.navigate('Signup')} style={[styles.ctaButton, styles.primaryCta, { backgroundColor: '#19A8E9' }]}>
              <Ionicons name="person-add-outline" size={18} color="#fff" />
              <Text style={styles.ctaText}>Create account</Text>
            </PressableScale>
          </Animated.View>
          <TouchableOpacity style={styles.signInLink} onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.signInText, { color: c.primary }]}>Already have an account? Sign in</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgLayer: { ...StyleSheet.absoluteFillObject },
  bgImage: { ...StyleSheet.absoluteFillObject },
  blob: { position: 'absolute', borderRadius: 999 },
  blobTop: { width: 220, height: 220, top: -70, right: -60 },
  blobMid: { width: 180, height: 180, top: 250, left: -70 },
  blobBottom: { width: 140, height: 140, bottom: 32, right: -45 },
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
  },
  pressWrap: { borderRadius: 14 },
  visualPressWrap: { width: '49%' },
  card3dTilt: { transform: [{ perspective: 1000 }, { rotateX: '10deg' }] },
  hero: {
    borderRadius: 18,
    padding: 18,
    overflow: 'hidden',
    marginBottom: 10,
  },
  heroGlow: {
    position: 'absolute',
    top: -30,
    left: -20,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: '#FFFFFF3D',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBadge: {
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },
  heroBrain: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF55',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF1F',
  },
  heroTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
    fontFamily: 'serif',
    letterSpacing: 0.2,
  },
  heroSubtitle: {
    color: '#FFFFFFE5',
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '700',
    marginTop: 8,
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
  },
  heroStatChip: {
    borderWidth: 1,
    borderColor: '#FFFFFF66',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
  },
  hookStrip: {
    padding: 14,
    marginBottom: 10,
  },
  hookTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'serif',
  },
  hookLine: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  visualRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visualCard: {
    width: '100%',
    padding: 12,
    minHeight: 120,
  },
  visualTitle: {
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8,
  },
  visualText: {
    fontSize: 11,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 6,
  },
  actions: {
    width: '100%',
    marginTop: 10,
  },
  ctaButton: {
    borderRadius: 999,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0EA5E9',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#FFFFFF55',
  },
  primaryCta: {
    shadowColor: '#22C55E',
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 8,
  },
  featureCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
    fontFamily: 'serif',
  },
  featureItem: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 2,
  },
  signInLink: {
    marginTop: 12,
    alignItems: 'center',
  },
  signInText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

