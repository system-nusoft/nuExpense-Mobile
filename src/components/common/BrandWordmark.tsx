import React from 'react';
import {Platform, StyleSheet, Text, TextStyle} from 'react-native';

/** Navy from the Z monogram app icon. */
export const BRAND_NAVY = '#004878';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  style?: TextStyle;
};

const SIZE_MAP = {
  sm: 28,
  md: 40,
  lg: 52,
} as const;

/**
 * Text wordmark matching the rounded navy Z icon style.
 * Used on splash-adjacent loading and auth screens (not the app icon).
 */
export default function BrandWordmark({size = 'md', style}: Props) {
  return (
    <Text
      accessibilityRole="header"
      style={[styles.base, {fontSize: SIZE_MAP[size]}, style]}>
      Zingg
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: BRAND_NAVY,
    fontWeight: '800',
    letterSpacing: -0.5,
    // Matches the rounded terminals of the Z monogram; Arial Rounded ships on iOS.
    fontFamily: Platform.select({
      ios: 'ArialRoundedMTBold',
      android: 'sans-serif-black',
      default: undefined,
    }),
  },
});
