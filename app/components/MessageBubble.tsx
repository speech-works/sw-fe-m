import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../Theme/tokens";

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
  return (
    <View
      style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.agentMessageContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🤖</Text>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.agentBubble,
        ]}
      >
        <Text style={[isUser ? styles.userText : styles.agentText]}>
          {message}
        </Text>
      </View>
    </View>
  );
};

export default MessageBubble;

const styles = StyleSheet.create({
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 8,
    maxWidth: "80%",
  },
  userMessageContainer: {
    alignSelf: "flex-end",
    marginLeft: "auto",
  },
  agentMessageContainer: {
    alignSelf: "flex-start",
    marginRight: "auto",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.library.blue[600],
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    overflow: "hidden",
  },
  avatarText: {
    fontSize: 16,
    color: "#fff",
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 20,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  userBubble: {
    backgroundColor: theme.colors.library.green[100],
    borderBottomRightRadius: 5,
  },
  agentBubble: {
    backgroundColor: theme.colors.surface.default,
    borderBottomLeftRadius: 5,
  },
  userText: {
    color: theme.colors.text.default,
  },
  agentText: {
    color: theme.colors.text.default,
  },
});
