import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Platform } from 'react-native';
import { Colors } from '../../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
  glow?: boolean;
}

export function GlassCard({ children, style, borderColor, glow = false }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        glow && styles.glow,
        borderColor ? { borderColor } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 3px 12px 0 rgba(15, 23, 42, 0.07)',
      } as any,
    }),
  },
  glow: {
    borderColor: Colors.light.primary,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: Colors.light.primary,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 4px 16px rgba(30, 58, 138, 0.14)',
      } as any,
    }),
  },
});
