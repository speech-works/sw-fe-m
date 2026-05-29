import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../../../Theme/tokens';
import { parseTextStyle } from '../../../../../util/functions/parseStyles';
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
        <View style={styles.header}>
          <Text style={styles.description}>
            {practiceData.description || "Speak to your camera and notice what your body does. No scores, no performance — just observation."}
          </Text>
        </View>

        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>What to expect</Text>
          {mirrorWorkData.tips.map((tip, index) => (
            <View key={index} style={styles.tipRow}>
              <View style={styles.bullet} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.privacyCard}>
          <Icon name="lock-closed" size={24} color="#34C759" style={styles.privacyIcon} />
          <View style={styles.privacyTextContainer}>
            <Text style={styles.privacyTitle}>100% Private</Text>
            <Text style={styles.privacyText}>
              Your camera is used only on this device. No video is recorded, stored, or sent anywhere.
            </Text>
          </View>
        </View>

        <View style={styles.privacyCard}>
          <Icon name="lightbulb" size={24} color="#007AFF" style={styles.privacyIcon} />
          <View style={styles.privacyTextContainer}>
            <Text style={styles.privacyTitle}>Gentle Notes</Text>
            <Text style={styles.privacyText}>
              During the session, we'll show you a few observations as they happen — not every single one. This keeps things comfortable. Your full summary will include everything we noticed.
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.startButton} onPress={handleStart}>
          <Text style={styles.startButtonText}>Begin Session</Text>
        </TouchableOpacity>
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
  header: {
    marginBottom: 32,
  },
  description: {
    fontSize: 17,
    color: '#3A3A3C',
    lineHeight: 24,
  },
  tipsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  tipRow: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingRight: 10,
  },
  bullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginTop: 8,
    marginRight: 12,
  },
  tipText: {
    fontSize: 16,
    color: '#1C1C1E',
    lineHeight: 24,
    flex: 1,
  },
  privacyCard: {
    flexDirection: 'row',
    backgroundColor: '#F2F2F7',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
  },
  privacyIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  privacyTextContainer: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 0 : 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});

