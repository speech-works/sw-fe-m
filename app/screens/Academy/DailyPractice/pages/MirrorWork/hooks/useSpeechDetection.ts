import { useState, useEffect, useRef, useCallback } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export function useSpeechDetection() {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Track the last timestamp we received a partial/final speech result
  // Initialize to 0 so we are "silent" by default until speech is detected
  const lastSpeechTimeRef = useRef<number>(0);

  // Helper function to check if the user has been silent for a given threshold
  const isSilent = useCallback((thresholdMs: number = 800) => {
    if (!isRecording) return true;
    
    // If we haven't spoken yet since starting, we are silent.
    if (lastSpeechTimeRef.current === 0) return true;

    return (Date.now() - lastSpeechTimeRef.current) > thresholdMs;
  }, [isRecording]);

  useSpeechRecognitionEvent('result', (event) => {
    // Whenever we get a result (interim or final), speech is happening
    lastSpeechTimeRef.current = Date.now();
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('[useSpeechDetection] Error:', event.error, event.message);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecording(false);
  });

  useSpeechRecognitionEvent('start', () => {
    setIsRecording(true);
  });

  const requestPermission = async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    setHasPermission(result.granted);
    return result.granted;
  };

  const startListening = async () => {
    const granted = await requestPermission();
    if (!granted) {
      console.warn('[useSpeechDetection] Permission denied');
      return;
    }

    try {
      lastSpeechTimeRef.current = 0; // reset on start
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true, // Keep listening until stopped
        iosVoiceProcessingEnabled: true, // Echo cancellation
      });
    } catch (err) {
      console.error('[useSpeechDetection] Failed to start:', err);
    }
  };

  const stopListening = () => {
    ExpoSpeechRecognitionModule.stop();
  };

  useEffect(() => {
    ExpoSpeechRecognitionModule.getPermissionsAsync().then((result) => {
      setHasPermission(result.granted);
    });

    return () => {
      ExpoSpeechRecognitionModule.abort();
    };
  }, []);

  return {
    isRecording,
    hasPermission,
    requestPermission,
    startListening,
    stopListening,
    isSilent,
  };
}
