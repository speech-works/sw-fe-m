import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MirrorWorkCognitivePrompt } from '../types';

interface CognitivePromptCardProps {
  prompt: MirrorWorkCognitivePrompt;
}

export const CognitivePromptCard: React.FC<CognitivePromptCardProps> = ({ prompt }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.promptText}>{prompt.text}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(28, 28, 30, 0.75)', // Translucent dark pill
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  promptText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
