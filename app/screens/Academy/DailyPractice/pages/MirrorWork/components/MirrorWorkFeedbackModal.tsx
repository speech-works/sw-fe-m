import React, { useState } from 'react';
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
            maximumTrackTintColor="#E5E5EA"
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
            maximumTrackTintColor="#E5E5EA"
          />
          <View style={styles.labels}>
            <Text style={styles.labelText}>None</Text>
            <Text style={styles.labelText}>Fully In Control</Text>
          </View>
        </View>

        <View style={styles.sliderSection}>
          <Text style={styles.question}>Looking at the summary — how well does this match what you experienced?</Text>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={5}
            step={1}
            value={accuracyRating}
            onValueChange={setAccuracyRating}
            minimumTrackTintColor="#007AFF"
            maximumTrackTintColor="#E5E5EA"
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 32,
  },
  sliderSection: {
    marginBottom: 32,
  },
  question: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
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
    color: '#8E8E93',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
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
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
