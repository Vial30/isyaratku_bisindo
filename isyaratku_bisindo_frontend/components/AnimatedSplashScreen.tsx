import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

interface AnimatedSplashScreenProps {
  onFinish: () => void;
}

const { width } = Dimensions.get('window');

export function AnimatedSplashScreen({ onFinish }: AnimatedSplashScreenProps) {
  // Animation Values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.90)).current;
  const containerFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Hide native static splash screen once component mounts
    SplashScreen.hideAsync().catch(() => {});

    // 1. Entrance animation (Clean scale & fade in like Meta / Facebook app)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Exit transition: hold for 1.6s then smooth fade out into main app
    const timer = setTimeout(() => {
      Animated.timing(containerFadeAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 1600);

    return () => {
      clearTimeout(timer);
    };
  }, [fadeAnim, scaleAnim, containerFadeAnim, onFinish]);

  return (
    <Animated.View style={[styles.container, { opacity: containerFadeAnim }]}>
      {/* Center: Iconic App Logo (Meta / Facebook Style) */}
      <View style={styles.centerContainer}>
        <Animated.View
          style={[
            styles.logoWrapper,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* Bottom: Subtle Loading Spinner & App Signature */}
      <Animated.View style={[styles.footerContainer, { opacity: fadeAnim }]}>
        <ActivityIndicator size="small" color="#38BDF8" style={styles.spinner} />
        <Text style={styles.brandTitle}>ISYARATKU BISINDO</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0A0F1D', // Deep midnight sapphire matching the logo
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Platform.OS === 'ios' ? 50 : 35,
    zIndex: 9999,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  logoImage: {
    width: 130,
    height: 130,
    borderRadius: 28,
  },
  footerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  spinner: {
    marginBottom: 16,
  },
  fromLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'lowercase',
  },
  brandTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 2,
  },
});
