import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    background: '#F8FAFC',
    tint: '#1E3A8A',
    icon: '#64748B',
    tabIconDefault: '#64748B',
    tabIconSelected: '#1E3A8A',
    surface: '#FFFFFF',
    surfaceGlass: '#FFFFFF',
    primary: '#1E3A8A',
    primaryAccent: '#2563EB',
    secondary: '#0D9488',
    border: '#E2E8F0',
    card: '#FFFFFF',
    mutedText: '#64748B',
  },
  dark: {
    text: '#0F172A',
    background: '#F8FAFC',
    tint: '#1E3A8A',
    icon: '#64748B',
    tabIconDefault: '#64748B',
    tabIconSelected: '#1E3A8A',
    surface: '#FFFFFF',
    surfaceGlass: '#FFFFFF',
    primary: '#1E3A8A',
    primaryAccent: '#2563EB',
    secondary: '#0D9488',
    border: '#E2E8F0',
    card: '#FFFFFF',
    mutedText: '#64748B',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, Roboto, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
