// CallScreenWithTranscript.tsx
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import MessageBubble from "../../../../../../../components/MessageBubble";
import { theme } from "../../../../../../../Theme/tokens";
import CallingWidget from "../../../../../../../components/CallingWidget";

// Define Message interface
interface Message {
  sender: "user" | "agent";
  content: string;
}

// Define Turn type
type Turn = "user" | "agent";

const CallScreenWithTranscript: React.FC = () => {
  const [isCallActive, setIsCallActive] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [currentTurn, setCurrentTurn] = useState<Turn>("agent"); // 'user' or 'agent'
  const [userMessage, setUserMessage] = useState<string>("");

  const scrollViewRef = useRef<ScrollView>(null); // Specify ScrollView type for useRef

  // Initial greeting from the agent
  useEffect(() => {
    if (isCallActive && transcript.length === 0) {
      const initialAgentMessage: Message = {
        sender: "agent",
        content:
          "Hello! I'll be your practice partner today. Ready when you are.",
      };
      setTimeout(() => {
        setTranscript([initialAgentMessage]);
        setCurrentTurn("user"); // After agent's greeting, it's user's turn
      }, 500); // Small delay for effect
    } else if (!isCallActive) {
      setTranscript([]); // Clear transcript when call ends
      setCurrentTurn("agent"); // Reset turn
    }
  }, [isCallActive]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [transcript]);

  const handleSendUserMessage = () => {
    if (userMessage.trim() === "" || currentTurn !== "user") return;

    const newUserMessage: Message = {
      sender: "user",
      content: userMessage.trim(),
    };
    setTranscript((prev) => [...prev, newUserMessage]);
    setUserMessage("");
    setCurrentTurn("agent"); // Switch turn to agent

    // Simulate agent's response
    setTimeout(() => {
      const agentResponse: Message = {
        sender: "agent",
        content: "Hmm, that's an interesting point. What else can you tell me?",
      };
      setTranscript((prev) => [...prev, agentResponse]);
      setCurrentTurn("user"); // Switch turn back to user
    }, 1500); // Simulate network delay for agent response
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.transcriptContainer}
          showsVerticalScrollIndicator={false}
        >
          {transcript.map((msg, index) => (
            <MessageBubble
              key={index}
              message={msg.content}
              isUser={msg.sender === "user"}
            />
          ))}
          {isCallActive && currentTurn === "agent" && (
            <View style={styles.typingIndicatorContainer}>
              <Text style={styles.typingIndicatorText}>
                Agent is thinking...
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottomContainer}>
          {isCallActive && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder={
                  currentTurn === "user"
                    ? "Type your response..."
                    : "Agent's turn..."
                }
                placeholderTextColor={theme.colors.text.onDark}
                value={userMessage}
                onChangeText={setUserMessage}
                editable={isCallActive && currentTurn === "user"}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !(
                    isCallActive &&
                    currentTurn === "user" &&
                    userMessage.trim() !== ""
                  ) && styles.disabledButton,
                ]}
                onPress={handleSendUserMessage}
                disabled={
                  !(
                    isCallActive &&
                    currentTurn === "user" &&
                    userMessage.trim() !== ""
                  )
                }
              >
                <Icon name="paper-plane" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          <CallingWidget
            isCallActive={isCallActive}
            setIsCallActive={setIsCallActive}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CallScreenWithTranscript;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  transcriptContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  bottomContainer: {
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.background.default,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border.default,
    paddingTop: 10,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: theme.colors.surface.default,
    borderRadius: 25,
    paddingHorizontal: 10,
    minHeight: 50,
    maxHeight: 150,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  textInput: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    paddingHorizontal: 10,
    fontSize: 16,
    color: theme.colors.text.default,
  },
  sendButton: {
    backgroundColor: theme.colors.library.blue[600],
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  disabledButton: {
    backgroundColor: theme.colors.surface.disabled,
  },
  typingIndicatorContainer: {
    alignSelf: "flex-start",
    marginLeft: 8,
    marginBottom: 10,
  },
  typingIndicatorText: {
    fontStyle: "italic",
    color: theme.colors.text.onDark,
  },
});
