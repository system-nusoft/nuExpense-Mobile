import React from 'react';
import {View, StyleSheet, ViewStyle, StyleProp} from 'react-native';
import Icon from './Icon';
import {resolveCategoryIcon} from '../../lib/categoryIcons';

type Props = {
  icon?: string | null;
  color?: string;
  size?: number;
  badgeSize?: number;
  style?: StyleProp<ViewStyle>;
  /** When false, renders icon only (no colored badge). */
  withBadge?: boolean;
};

/** Renders a category icon as Feather, with badge tint from category color. */
export default function CategoryIcon({
  icon,
  color = '#3e6378',
  size = 20,
  badgeSize = 44,
  style,
  withBadge = true,
}: Props) {
  const name = resolveCategoryIcon(icon);

  if (!withBadge) {
    return <Icon name={name} size={size} color={color} />;
  }

  return (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize * 0.27,
          backgroundColor: color.length === 7 ? `${color}22` : '#eef2f5',
        },
        style,
      ]}>
      <Icon name={name} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
