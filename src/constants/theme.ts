/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

const brandLight = {
  sand: '#EAF1F3',
  sandDeep: '#CEDDE1',
  clay: '#455A64',
  claySoft: '#687C85',
  gold: '#E0A24C',
  goldDark: '#B96F1E',
  ink: '#10232B',
  danger: '#D85757',
  white: '#FFFFFF',
  onAccent: '#FFFFFF',
  primary: '#4F8790',
  primaryStrong: '#202B34',
  roomSection: '#4F8790',
  calendarBlue: '#4F8790',
  calendarTurnover: '#E07B32',
  link: '#3D78B8',
  overlay: 'rgba(7, 12, 16, 0.56)',
  onAccentSoft: 'rgba(255, 255, 255, 0.12)',
  onAccentBorder: 'rgba(255, 255, 255, 0.28)',
  warningSoft: 'rgba(212, 154, 69, 0.18)',
  warningBorder: 'rgba(212, 154, 69, 0.48)',
} as const;
const brandDark = {
  sand: '#0F151B',
  sandDeep: '#182129',
  clay: '#B8C2CA',
  claySoft: '#8F9BA5',
  gold: '#E0AD5C',
  goldDark: '#B96F1E',
  ink: '#F1F4F6',
  danger: '#D85757',
  white: '#202B34',
  onAccent: '#FFFFFF',
  primary: '#4F8790',
  primaryStrong: '#202B34',
  roomSection: '#4F8790',
  calendarBlue: '#4F8790',
  calendarTurnover: '#E07B32',
  link: '#3D78B8',
  overlay: 'rgba(3, 7, 10, 0.72)',
  onAccentSoft: 'rgba(255, 255, 255, 0.12)',
  onAccentBorder: 'rgba(255, 255, 255, 0.28)',
  warningSoft: 'rgba(212, 154, 69, 0.18)',
  warningBorder: 'rgba(212, 154, 69, 0.48)',
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
    link: brandLight.link,
  },
  dark: {
    text: brandDark.ink,
    background: brandDark.sand,
    backgroundElement: brandDark.sandDeep,
    backgroundSelected: brandDark.primary,
    textSecondary: brandDark.claySoft,
    link: brandDark.link,
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
