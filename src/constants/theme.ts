/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

const brandLight = {
  sand: '#f7f1ea',
  sandDeep: '#efe4d6',
  clay: '#5f6f6c',
  claySoft: '#7d8a87',
  gold: '#c9a876',
  goldDark: '#b8945f',
  ink: '#1f2a28',
  danger: '#c0392b',
  white: '#ffffff',
  /** Text/icons on primary, danger, and other solid accents — always light */
  onAccent: '#ffffff',
  /** Main teal accent — title, CTAs, calendar stay */
  primary: '#2f6f6a',
  calendarBlue: '#2f6f6a',
  calendarTurnover: '#e08a3a',
} as const;

/** Dark surfaces keep the resort teal mood, not pure black */
const brandDark = {
  sand: '#141c1b',
  sandDeep: '#1e2a28',
  clay: '#a8b5b2',
  claySoft: '#8f9e9b',
  gold: '#d4b896',
  goldDark: '#c9a876',
  ink: '#f2ebe3',
  danger: '#e74c3c',
  white: '#1c2624',
  /** Text/icons on primary, danger, and other solid accents — always light */
  onAccent: '#ffffff',
  primary: '#4a9e97',
  calendarBlue: '#4a9e97',
  calendarTurnover: '#e08a3a',
} as const;

export const BrandPalettes = {
  light: brandLight,
  dark: brandDark,
} as const;

export type BrandColors = (typeof BrandPalettes)[keyof typeof BrandPalettes];

/** Default / light palette — prefer `useBrand()` in screens */
export const Brand = BrandPalettes.light;

export const Colors = {
  light: {
    text: brandLight.ink,
    background: brandLight.sand,
    backgroundElement: brandLight.sandDeep,
    backgroundSelected: brandLight.primary,
    textSecondary: brandLight.claySoft,
  },
  dark: {
    text: brandDark.ink,
    background: brandDark.sand,
    backgroundElement: brandDark.sandDeep,
    backgroundSelected: brandDark.primary,
    textSecondary: brandDark.claySoft,
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
