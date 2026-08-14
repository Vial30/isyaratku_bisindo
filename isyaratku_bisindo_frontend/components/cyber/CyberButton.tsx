import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/theme';

interface CyberButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'glass' | 'danger';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  loading?: boolean;
  haptic?: boolean;
  icon?: React.ReactNode;
}

export function CyberButton({
  title,
  onPress,
  variant = 'primary',
  style,
  textStyle,
  disabled = false,
  loading = false,
  haptic = true,
  icon,
}: CyberButtonProps) {
  const handlePress = async () => {
    if (disabled || loading) return;
    if (haptic && Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (e) {
        // Safe fallback if haptics fail
      }
    }
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'glass' ? Colors.light.primary : '#FFFFFF'}
        />
      ) : (
        <>
          {icon && icon}
          <Text
            style={[
              styles.text,
              variant === 'glass' && styles.textGlass,
              variant === 'primary' && styles.textPrimary,
              variant === 'secondary' && styles.textSecondary,
              variant === 'danger' && styles.textDanger,
              disabled && styles.textDisabled,
              textStyle,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primary: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
  },
  secondary: {
    backgroundColor: Colors.light.secondary,
    borderColor: Colors.light.secondary,
    shadowColor: Colors.light.secondary,
  },
  glass: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.light.border,
    shadowColor: '#0F172A',
  },
  danger: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  disabled: {
    backgroundColor: '#E2E8F0',
    borderColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textPrimary: {
    color: '#FFFFFF',
  },
  textSecondary: {
    color: '#FFFFFF',
  },
  textGlass: {
    color: Colors.light.text,
  },
  textDanger: {
    color: '#FFFFFF',
  },
  textDisabled: {
    color: '#94A3B8',
  },
});
