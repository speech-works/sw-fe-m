import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { MirrorWorkFeedbackModal } from './components/MirrorWorkFeedbackModal';
import { MirrorBehaviorSignal } from './types';

export const SummaryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { 
    scores, 
    promptsAttempted, 
    nudgeMode, 
    sessionDurationSeconds, 
    signalCounts, 
    reflectionText 
  } = route.params || {};

  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const handleComplete = () => {
    setShowFeedbackModal(true);
  };

  const submitFinalData = (feedback: { effortScore: number; autonomyScore: number; detectionAccuracyRating: number }) => {
    setShowFeedbackModal(false);
    
    // In a real implementation, dispatch to Redux/Zustand or API here:
    const payload = {
      practiceActivityId: "TECH_COGNITIVE_MIRROR_WORK_GENERAL", // Ideally passed from route
      detectedSignals: signalCounts,
      awarenessScores: scores,
      vitals: {
        effortScore: feedback.effortScore,
        autonomyScore: feedback.autonomyScore,
      },
      detectionAccuracyRating: feedback.detectionAccuracyRating,
      reflectionText,
      promptsAttempted,
      nudgeMode,
      sessionDurationSeconds,
    };
    
    console.log("Submitting Mirror Work Data:", JSON.stringify(payload, null, 2));

    // Navigate back to DailyPractice or Home
    navigation.navigate('Home'); 
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderEaseBar = (label: string, score: number) => (
    <View style={styles.barContainer}>
      <View style={styles.barHeader}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barScore}>{score}%</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${score}%`, backgroundColor: score > 70 ? '#34C759' : score > 40 ? '#FF9500' : '#FF3B30' }]} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Session Summary</Text>
          <Text style={styles.subtitle}>
            {nudgeMode === 'OFF' ? 
              "You practiced in Quiet Mode, but we still kept track of these observations for you." : 
              "Here's a breakdown of what we observed while you were speaking."}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{formatDuration(sessionDurationSeconds || 0)}</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{promptsAttempted || 0}</Text>
            <Text style={styles.statLabel}>Prompts</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{scores?.overallEaseScore || 100}</Text>
            <Text style={styles.statLabel}>Overall Ease</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Physical Ease Scores</Text>
          {renderEaseBar("Jaw Ease", scores?.jawEase || 100)}
          {renderEaseBar("Lip Ease", scores?.lipEase || 100)}
          {renderEaseBar("Gaze Maintained", scores?.gazeMaintained || 100)}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Observations</Text>
          {Object.keys(signalCounts || {}).length === 0 ? (
            <Text style={styles.emptyText}>No physical tension patterns were detected during this session.</Text>
          ) : (
            Object.keys(signalCounts).map((key) => {
              const signalName = key.replace(/_/g, ' ');
              return (
                <View key={key} style={styles.observationRow}>
                  <Text style={styles.observationName}>{signalName}</Text>
                  <Text style={styles.observationCount}>{signalCounts[key].eventCount} times</Text>
                </View>
              );
            })
          )}
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={handleComplete}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showFeedbackModal} animationType="slide" transparent>
        <MirrorWorkFeedbackModal 
          onSubmit={submitFinalData} 
          onClose={() => setShowFeedbackModal(false)} 
        />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#3A3A3C',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '31%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  barContainer: {
    marginBottom: 16,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 15,
    color: '#3A3A3C',
    fontWeight: '500',
  },
  barScore: {
    fontSize: 15,
    color: '#1C1C1E',
    fontWeight: '600',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#E5E5EA',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  observationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  observationName: {
    fontSize: 15,
    color: '#1C1C1E',
    textTransform: 'capitalize',
  },
  observationCount: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
