/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/** Resort palette used across home / booking screens */
export const Brand = {
  sand: '#f7f1ea',
  sandDeep: '#efe4d6',
  clay: '#5f6f6c',
  claySoft: '#7d8a87',
  gold: '#c9a876',
  goldDark: '#b8945f',
  ink: '#1f2a28',
  danger: '#c0392b',
  white: '#ffffff',
  /** Main teal accent — title, CTAs, calendar stay */
  primary: '#2f6f6a',
  calendarBlue: '#2f6f6a',
  calendarTurnover: '#e08a3a',
} as const;

export const Colors = {
  light: {
    text: Brand.ink,
    background: Brand.sand,
    backgroundElement: Brand.sandDeep,
    backgroundSelected: Brand.primary,
    textSecondary: Brand.claySoft,
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
