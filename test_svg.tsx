import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export default function Test() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 30 64">
      <Path d="M 0 0 C 15 0, 15 16, 30 16 L 30 48 C 15 48, 15 64, 0 64 Z" fill="red" />
    </Svg>
  );
}
