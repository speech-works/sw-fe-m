import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface FaceFrameGuardProps {
  faceInFrame: boolean;
  lightingWarning: boolean;
}

export const FaceFrameGuard: React.FC<FaceFrameGuardProps> = ({ faceInFrame, lightingWarning }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const showBanner = !faceInFrame || lightingWarning;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: showBanner ? 20 : -100, // Slide down if out of frame or poor lighting
      useNativeDriver: true,
      friction: 8,
    }).start();
  }, [showBanner, slideAnim]);

  const message = !faceInFrame
    ? "We can't see your face — try moving back into the frame."
    : "The lighting isn't ideal for accurate detection. Try moving to a brighter spot.";

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(80, 80, 80, 0.95)', // Soft gray background, not warning red
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 90,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
  },
});
