import React, { useState } from 'react';
// MirrorWork's overlays are ForceDark-locked (they sit over a live camera
// feed, which has no scheme), so the dark role set is the CORRECT static
// source here — same precedent as UpsellModal's `elevationDark`. The state
// hues below are still raw: their values are tied to the clinical weight
// table and are not mine to reassign.
// The paper ramp for this light-locked screen. Every neutral in the app
// carries the same warm hue; these were Tailwind/iOS cool greys.
import { lightColors as paper } from "../../../../../../design-system/semantic/light";
import { darkColors as c } from "../../../../../../design-system/semantic/dark";
import { withAlpha, radius } from "../../../../../../design-system";
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import Slider from '@react-native-community/slider';

interface FeedbackData {
  effortScore: number;
  autonomyScore: number;
  detectionAccuracyRating: number;
}

interface MirrorWorkFeedbackModalProps {
  onSubmit: (data: FeedbackData) => void;
  onClose: () => void;
}

export const MirrorWorkFeedbackModal: React.FC<MirrorWorkFeedbackModalProps> = ({ onSubmit, onClose }) => {
  // We use 1-5 scales for the UI, then convert to 20-100 before submit
  const [effortScore, setEffortScore] = useState(3);
  const [autonomyScore, setAutonomyScore] = useState(3);
  const [accuracyRating, setAccuracyRating] = useState(3);

  const handleSubmit = () => {
    onSubmit({
      effortScore: effortScore * 20,
      autonomyScore: autonomyScore * 20,
      detectionAccuracyRating: accuracyRating * 20,
    });
  };

  return (
    <SafeAreaView style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.title}>Session Reflection</Text>
        <Text style={styles.subtitle}>Help us understand how this felt for you.</Text>

        <View style={styles.sliderSection}>
          <Text style={styles.question}>How difficult was it to stay focused on the camera?</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={effortScore}
            onValueChange={setEffortScore}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor={paper.background.sunken}
          />
          <View style={styles.labels}>
            <Text style={styles.labelText}>Very Easy</Text>
            <Text style={styles.labelText}>Very Hard</Text>
          </View>
        </View>

        <View style={styles.sliderSection}>
          <Text style={styles.question}>How much control did you feel over your breathing and pace?</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={autonomyScore}
            onValueChange={setAutonomyScore}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor={paper.background.sunken}
          />
          <View style={styles.labels}>
            <Text style={styles.labelText}>None</Text>
            <Text style={styles.labelText}>Fully In Control</Text>
          </View>
        </View>

        <View style={styles.sliderSection}>
          <Text style={styles.question}>Looking at the summary, how well does this match what you experienced?</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={accuracyRating}
            onValueChange={setAccuracyRating}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor={paper.background.sunken}
          />
          <View style={styles.labels}>
            <Text style={styles.labelText}>Way Off</Text>
            <Text style={styles.labelText}>Spot On</Text>
          </View>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.submitButton]} onPress={handleSubmit}>
            <Text style={styles.submitText}>Complete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: withAlpha(c.shadow, 0.5),
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.text.primary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: paper.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: paper.text.tertiary,
    marginBottom: 32,
  },
  sliderSection: {
    marginBottom: 32,
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    color: paper.text.primary,
    marginBottom: 16,
    lineHeight: 22,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginTop: -5,
  },
  labelText: {
    fontSize: 13,
    color: paper.text.tertiary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: radius.sheet,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: paper.background.canvas,
    marginRight: 12,
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  cancelText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  submitText: {
    color: c.text.primary,
    fontSize: 17,
    fontWeight: '600',
  },
});
