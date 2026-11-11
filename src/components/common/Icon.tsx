import React from 'react';
import {StyleProp, TextStyle} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';

/** Brand-aligned stroke icon set (Feather). Keep weight consistent across chrome. */
export type IconName = React.ComponentProps<typeof Feather>['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
};

export default function Icon({
  name,
  size = 20,
  color = '#3e6378',
  style,
}: Props) {
  return <Feather name={name} size={size} color={color} style={style} />;
}
