import React, { useState } from 'react';
import { makeStyles, useTheme, radius } from "../../../../../../design-system";
import { View, Text, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import Slider from '@react-native-community/slider';

/*
 * ONE QUESTION, AND IT IS ABOUT US.
 *
 * This modal used to open with the same two sliders the app asked after every
 * other practice: how hard was it, how much control did you feel. Both fed
 * `user_practice_vitals`, which fed a five-axis model that no screen ever
 * showed, so the answers were collected and never read. They went with that
 * model.
 *
 * What is left is the one question that earns its place: whether our detection
 * matched what the person actually experienced. That rates OUR work, not
 * theirs, and it is the signal the weight table is tuned against.
 */
interface FeedbackData {
  detectionAccuracyRating: number;
}

interface MirrorWorkFeedbackModalProps {
  onSubmit: (data: FeedbackData) => void;
  onClose: () => void;
}

export const MirrorWorkFeedbackModal: React.FC<MirrorWorkFeedbackModalProps> = ({ onSubmit, onClose }) => {
  const { colors } = useTheme();
  const styles = useStyles();
  // A 1-5 scale in the UI, converted to 20-100 before submit.
  const [accuracyRating, setAccuracyRating] = useState(3);

  const handleSubmit = () => {
    onSubmit({ detectionAccuracyRating: accuracyRating * 20 });
  };

  return (
    <SafeAreaView style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.title}>Session Reflection</Text>
        <Text style={styles.subtitle}>Help us understand how this felt for you.</Text>

                        <View style={styles.sliderSection}>
          <Text style={styles.question}>Looking at the summary, how well does this match what you experienced?</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={accuracyRating}
            onValueChange={setAccuracyRating}
            minimumTrackTintColor={colors.action.primary}
            maximumTrackTintColor={colors.border.hairline}
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

const useStyles = makeStyles((c) => ({
  modalOverlay: {
    flex: 1,
    backgroundColor: c.overlay.scrim,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: c.surface.default,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: c.text.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: c.text.tertiary,
    marginBottom: 32,
  },
  sliderSection: {
    marginBottom: 32,
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    color: c.text.primary,
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
    color: c.text.tertiary,
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
    backgroundColor: c.background.canvas,
    marginRight: 12,
  },
  submitButton: {
    backgroundColor: c.action.primary,
  },
  cancelText: {
    color: c.text.accent,
    fontSize: 17,
    fontWeight: '600',
  },
  submitText: {
    color: c.text.primary,
    fontSize: 17,
    fontWeight: '600',
  },
}));
