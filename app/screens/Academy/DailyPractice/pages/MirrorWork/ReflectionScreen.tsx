import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

export const ReflectionScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { scores, promptsAttempted, nudgeMode, sessionDurationSeconds, signalCounts } = route.params || {};

  const [reflectionText, setReflectionText] = useState('');

  const handleNext = () => {
    navigation.navigate('MirrorWorkSummary', {
      scores,
      promptsAttempted,
      nudgeMode,
      sessionDurationSeconds,
      signalCounts,
      reflectionText
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <TouchableOpacity style={styles.closeButton} onPress={handleNext}>
          <Icon name="close" size={28} color="#1C1C1E" />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title}>What surprised you most about what you noticed?</Text>
          <Text style={styles.subtitle}>
            In speech therapy, noticing a pattern is the first step to having a choice about it. Writing it down helps cement the observation.
          </Text>

          <TextInput
            style={styles.textInput}
            multiline
            placeholder="I didn't realize my jaw was doing that..."
            placeholderTextColor="#8E8E93"
            value={reflectionText}
            onChangeText={setReflectionText}
            autoFocus
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.nextButton, !reflectionText.trim() && styles.nextButtonDisabled]} 
            onPress={handleNext}
            disabled={!reflectionText.trim()}
          >
            <Text style={styles.nextButtonText}>Continue</Text>
            <Icon name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#3A3A3C',
    lineHeight: 24,
    marginBottom: 32,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    fontSize: 17,
    color: '#1C1C1E',
    minHeight: 150,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 0 : 24,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#A1C6F7',
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    marginRight: 8,
  },
});
