import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import Icon from 'react-native-vector-icons/Ionicons';

interface FaceFrameGuardProps {
  faceInFrame: boolean;
  lightingWarning: boolean;
}

export const FaceFrameGuard: React.FC<FaceFrameGuardProps> = ({ faceInFrame, lightingWarning }) => {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showBanner = !faceInFrame || lightingWarning;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: showBanner ? 12 : -80,
        useNativeDriver: true,
        friction: 9,
        tension: 80,
      }),
      Animated.timing(opacityAnim, {
        toValue: showBanner ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [showBanner]);

  const iconName = !faceInFrame ? 'person-outline' : 'sunny-outline';
  const message = !faceInFrame
    ? "Move into the frame"
    : "Try better lighting";

  return (
    <Animated.View
      style={[
        styles.wrapper,
        { opacity: opacityAnim, transform: [{ translateY: slideAnim }] },
      ]}
      pointerEvents="none"
    >
      <BlurView intensity={Platform.OS === 'ios' ? 60 : 90} tint="dark" style={styles.blurPill}>
        <View style={styles.row}>
          <Icon name={iconName} size={16} color="#FCD34D" style={styles.icon} />
          <Text style={styles.text}>{message}</Text>
        </View>
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    alignSelf: 'center',
    borderRadius: 999,
    overflow: 'hidden',
    zIndex: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: Platform.OS === 'android' ? 0 : 3,
  },
  blurPill: {
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: Platform.OS === 'android' ? 'rgba(20, 20, 26, 0.82)' : 'rgba(20, 20, 26, 0.40)',
    paddingVertical: 9,
    paddingHorizontal: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
