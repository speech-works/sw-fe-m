import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '../../../../../components/Button';
import MasonryTips from '../../components/MasonryTips';
import { theme } from '../../../../../Theme/tokens';
import { parseTextStyle, parseShadowStyle } from '../../../../../util/functions/parseStyles';
import { MirrorWorkData } from './types';

export const PrepScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  
  // Assuming the backend cognitive practice data is passed in route.params
  const practiceData = route.params?.practiceData || {};
  const mirrorWorkData: MirrorWorkData = practiceData.mirrorWorkData || {
    tips: [
      "This isn't a performance. There's no audience, no score, no right answer.",
      "If you see a gentle note appear on screen, it's pointing out something your body is doing. You don't have to act on it — just notice it.",
      "Speak at whatever pace feels right. Silences are fine. There's no timer pushing you forward."
    ],
    cognitivePrompts: [
      { id: '1', category: 'General', text: 'What is one thing you are looking forward to today?' }
    ],
    focusAreas: []
  };

  const combinedTips = [
    ...mirrorWorkData.tips,
    "100% Private: Your camera is used only on this device. No video is recorded, stored, or sent anywhere.",
    "Gentle Notes: During the session, we'll show you a few observations as they happen — not every single one. Your full summary will include everything we noticed."
  ];

  const handleStart = () => {
    navigation.navigate('MirrorWorkSession', {
      prompts: mirrorWorkData.cognitivePrompts,
      practiceActivityId: practiceData.id
    });
  };

  return (
    <View style={styles.screenView}>
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.headerBar,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{practiceData.name || "Mirror Work"}</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={[
          styles.content,
          { paddingTop: HEADER_HEIGHT + insets.top + 20 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCardWrapper}>
          <LinearGradient
            colors={["#3B82F6", "#1E3A8A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Decorative Bubbles */}
            <View style={styles.bubbleTopRight} />
            <View style={styles.bubbleBottomLeft} />

            {/* Watermark */}
            <View style={styles.watermarkContainer}>
              <Icon name="camera" size={120} color="#FFF" style={{ opacity: 0.1 }} />
            </View>

            <View style={styles.heroContentContainer}>
              <View style={styles.chip}>
                <Icon name="eye" size={10} color="#FFF" />
                <Text style={styles.chipText}>Awareness</Text>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.heroTitleText}>{practiceData.name || "Mirror Work"}</Text>
                <Text style={styles.heroDescText}>
                  {practiceData.description || "Speak to your camera and notice what your body does. No scores, no performance — just observation."}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={styles.tipsContainer}>
          <MasonryTips tips={combinedTips} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Button text="Start practice" onPress={handleStart} style={styles.startButton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  tipsContainer: {
    marginTop: 16,
    marginHorizontal: -24,
  },
  heroCardWrapper: {
    borderRadius: 24,
    ...parseShadowStyle(theme.shadow.elevation2),
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  heroGradient: {
    borderRadius: 24,
    padding: 24,
    position: "relative",
    overflow: "hidden",
  },
  bubbleTopRight: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  bubbleBottomLeft: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  watermarkContainer: {
    position: "absolute",
    right: -20,
    bottom: -20,
    transform: [{ rotate: "-15deg" }],
  },
  heroContentContainer: {
    gap: 16,
    zIndex: 2,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    gap: 6,
  },
  chipText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  textContainer: {
    gap: 4,
  },
  heroTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 22,
  },
  heroDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(255, 255, 255, 0.8)",
  },
  footer: {
    padding: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  startButton: {
    borderRadius: 20,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
});

