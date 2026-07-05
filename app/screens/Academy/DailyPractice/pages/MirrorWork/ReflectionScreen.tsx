// Scheme-locked dark — camera surface (wrapped in ForceDark at the navigator).
// Hardcoded HUD/chrome colors here are intentional; do not theme-migrate them.
import React, { useState } from 'react';
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
          <TouchableOpacity style={styles.closeButton} onPress={handleContinue}>
            <Icon name="close" size={22} color="#374151" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconCircle}>
            <Icon name="pencil-outline" size={28} color="#F97316" />
          </View>

          <Text style={styles.title}>What did you notice?</Text>
          <Text style={styles.subtitle}>
            Noticing a pattern is the first step to having a choice about it. Write down anything that surprised you.
          </Text>

          <TextInput
            style={styles.textInput}
            multiline
            placeholder="I didn't realize my jaw was doing that…"
            placeholderTextColor="#9CA3AF"
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
            <Icon name="arrow-forward" size={18} color="#FFFFFF" style={styles.buttonIcon} />
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
    backgroundColor: '#FAFAFA',
  },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
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
    borderRadius: 32,
    backgroundColor: '#FEEDD3',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.7,
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 28,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    fontSize: 17,
    lineHeight: 24,
    color: '#1F2937',
    minHeight: 180,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  helperText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    paddingVertical: 16,
    borderRadius: 999,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonMuted: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0.15,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginLeft: 8,
  },
});
