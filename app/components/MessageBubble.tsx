import React from "react";
import { View } from "react-native";
import { makeStyles, Text } from "../design-system";

interface MessageBubbleProps {
  message: string;
  isUser: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isUser }) => {
  const styles = useStyles();
  return (
    <View
      style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.agentMessageContainer,
      ]}
    >
      {!isUser && (
        <View style={styles.avatar}>
          <Text variant="body">🤖</Text>
        </View>
      )}
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.agentBubble,
        ]}
      >
        <Text variant="body" color="primary">
          {message}
        </Text>
      </View>
    </View>
  );
};

export default MessageBubble;

const useStyles = makeStyles((c, t) => ({
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: t.spacing.sm,
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
    backgroundColor: c.accent.info,
    justifyContent: "center",
    alignItems: "center",
    marginRight: t.spacing.sm,
    overflow: "hidden",
  },
  messageBubble: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: t.radius.chip,
    ...t.elevation.e2,
  },
  userBubble: {
    backgroundColor: c.accentTint.success,
    borderBottomRightRadius: 5,
  },
  agentBubble: {
    backgroundColor: c.surface.elevated,
    borderBottomLeftRadius: 5,
  },
}));
