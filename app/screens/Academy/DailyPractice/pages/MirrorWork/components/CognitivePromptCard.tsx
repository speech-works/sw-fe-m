import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MirrorWorkCognitivePrompt } from '../types';

interface CognitivePromptCardProps {
  prompt: MirrorWorkCognitivePrompt;
  onNext: () => void;
  isLast: boolean;
}

export const CognitivePromptCard: React.FC<CognitivePromptCardProps> = ({ prompt, onNext, isLast }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.categoryBadge}>{prompt.category}</Text>
      <Text style={styles.promptText}>{prompt.text}</Text>
      
      <TouchableOpacity 
        style={styles.nextButton} 
        onPress={onNext}
        activeOpacity={0.7}
      >
        <Text style={styles.nextButtonText}>{isLast ? "Finish Session" : "Next Prompt"}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  promptText: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1C1C1E',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 30,
  },
  nextButton: {
    backgroundColor: '#007AFF', // Standard iOS blue, fits 'premium' feel
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
