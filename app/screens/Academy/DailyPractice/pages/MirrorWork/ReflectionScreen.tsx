// Scheme-locked dark — camera surface (wrapped in ForceDark at the navigator).
// Hardcoded HUD/chrome colors here are intentional; do not theme-migrate them.
import React, { useState } from 'react';
// MirrorWork's overlays are ForceDark-locked (they sit over a live camera
// feed, which has no scheme), so the dark role set is the CORRECT static
// source here — same precedent as UpsellModal's `elevationDark`. The state
// hues below are still raw: their values are tied to the clinical weight
// table and are not mine to reassign.
// The paper ramp for this light-locked screen. Every neutral in the app
// carries the same warm hue; these were Tailwind/iOS cool greys.
import { lightColors as paper } from "../../../../../design-system/semantic/light";
import { darkColors as c } from "../../../../../design-system/semantic/dark";
import { spacing, size, radius } from "../../../../../design-system";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useConfirmOnExit } from '../../../../../hooks/useConfirmOnExit';
import { wasMirrorWorkCompleted } from './util/mirrorCompletionGuard';

export const ReflectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();

  const {
    scores, promptsAttempted, nudgeMode, sessionDurationSeconds,
    signalCounts, practiceActivityId, weightTableVersion, packContext,
  } = route.params || {};

  const [reflectionText, setReflectionText] = useState('');

  const handleContinue = () => {
    navigation.navigate('MirrorWorkSummary', {
      scores,
      promptsAttempted,
      nudgeMode,
      sessionDurationSeconds,
      signalCounts,
      reflectionText,
      practiceActivityId,
      weightTableVersion,
      packContext,
    });
  };

  // Confirm-on-exit: leaving here without finishing prompts to save (continue to
  // the summary) or discard. Skips once the activity has been completed (read
  // live via the getter — the module flag does not re-render this screen).
  const { exitSheet } = useConfirmOnExit({
    navigation,
    activityId: practiceActivityId,
    isCompleted: () => wasMirrorWorkCompleted(practiceActivityId),
    onSave: handleContinue,
    family: 'Cognitive',
    packContext,
  });

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleContinue}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Icon name="close" size={size.icon} color={paper.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconCircle}>
            <Icon name="pencil-outline" size={size.iconLg} color="#F97316" />
          </View>

          <Text style={styles.title}>What did you notice?</Text>
          <Text style={styles.subtitle}>
            Noticing a pattern is the first step to having a choice about it. Write down anything that surprised you.
          </Text>

          <TextInput
            style={styles.textInput}
            multiline
            placeholder="I didn't realize my jaw was doing that…"
            placeholderTextColor={paper.text.tertiary}
            value={reflectionText}
            onChangeText={setReflectionText}
            autoFocus
            textAlignVertical="top"
          />

          <Text style={styles.helperText}>
            This stays private. No one else sees what you write.
          </Text>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            style={[styles.primaryButton, !reflectionText.trim() && styles.primaryButtonMuted]}
            onPress={handleContinue}
          >
            <Text style={styles.primaryButtonText}>
              {reflectionText.trim() ? 'Continue' : 'Skip'}
            </Text>
            <Icon name="arrow-forward" size={size.iconSm} color={c.text.primary} style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {exitSheet}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: paper.background.raised,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: c.text.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: paper.background.sunken,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: '#FEEDD3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: paper.text.primary,
    letterSpacing: -0.7,
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: paper.text.secondary,
    lineHeight: 24,
    marginBottom: 28,
  },
  textInput: {
    backgroundColor: c.text.primary,
    borderRadius: radius.chip,
    padding: 20,
    fontSize: 17,
    lineHeight: 24,
    color: paper.text.primary,
    minHeight: 180,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: paper.background.sunken,
    shadowColor: c.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  helperText: {
    fontSize: 13,
    color: paper.text.tertiary,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: paper.background.sunken,
    backgroundColor: c.text.primary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: radius.full,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonMuted: {
    backgroundColor: paper.text.tertiary,
    shadowOpacity: 0.15,
  },
  primaryButtonText: {
    color: c.text.primary,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
