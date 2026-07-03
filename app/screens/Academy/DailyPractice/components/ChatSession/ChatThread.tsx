import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomScrollView from "../../../../../components/CustomScrollView";
import {
  PageHeader,
  makeStyles,
  radius,
  space,
  spacing,
  useMotion,
  useTheme,
} from "../../../../../design-system";
import { RichText } from "./RichText";
import { SuggestionCards } from "./SuggestionCards";
import type { ChatSessionMessage, ChatSessionOption } from "./types";

interface ChatThreadProps<O extends ChatSessionOption> {
  /** Scrolls with the conversation via the standard PageHeader (like other screens). */
  title: string;
  onBack: () => void;
  messages: ChatSessionMessage[];
  /** The current turn's options, rendered inline under the newest message. */
  options: O[];
  armedOptionId: string | null;
  onArm: (option: O) => void;
  /** Bottom clearance so the newest content clears the floating dock. */
  bottomPadding: number;
  /** Category accent for the "You" ring + highlight chips + armed reply (optional). */
  accentColor?: string;
  onAccentColor?: string;
}

/**
 * The scrollable conversation. The page header (big title + back) scrolls with
 * the content exactly like every other migrated screen; response options render
 * inline as a choice list under the last message. On entry the thread lands at
 * the top (header visible, page-like); it auto-scrolls to the newest only after
 * the first turn.
 */
export function ChatThread<O extends ChatSessionOption>({
  title,
  onBack,
  messages,
  options,
  armedOptionId,
  onArm,
  bottomPadding,
  accentColor,
  onAccentColor,
}: ChatThreadProps<O>) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { enter } = useMotion();
  const insets = useSafeAreaInsets();
  const chatScrollRef = useRef<Animated.ScrollView>(null);

  // Only scroll to the newest once the conversation is under way — the first turn
  // stays at the top so the header/title reads like a normal page on entry.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (chatScrollRef.current && messages.length > 1) {
      timer = setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [messages, options.length, armedOptionId]);

  return (
    <View style={styles.area}>
      <CustomScrollView
        ref={chatScrollRef}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.inlineGap, paddingBottom: bottomPadding },
        ]}
        style={styles.view}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader title={title} onBack={onBack} />

        {messages.map((message) => (
          <Animated.View
            key={message.id}
            entering={enter()}
            style={
              message.type === "incoming"
                ? styles.incoming
                : [styles.outgoing, accentColor ? { borderColor: accentColor } : null]
            }
          >
            <RichText
              text={message.text}
              color={colors.text.primary}
              align="start"
              accentColor={accentColor}
              onAccentColor={onAccentColor}
            />
          </Animated.View>
        ))}

        <SuggestionCards
          options={options}
          armedOptionId={armedOptionId}
          onArm={onArm}
          accentColor={accentColor}
          onAccentColor={onAccentColor}
        />
      </CustomScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  area: {
    flex: 1,
    overflow: "hidden",
  },
  view: {
    flex: 1,
  },
  scroll: {
    gap: spacing.xl,
    paddingHorizontal: space.screenX,
  },
  incoming: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderTopLeftRadius: radius.xs,
    backgroundColor: c.surface.elevated,
    maxWidth: "85%",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: c.border.hairline,
  },
  outgoing: {
    padding: spacing.lg,
    borderRadius: radius.card,
    borderBottomRightRadius: radius.xs,
    // "You" bubble: neutral-dark surface + an orange ring for identity — NOT an
    // orange fill, so the warm highlight chips never disappear into it.
    backgroundColor: c.surface.control,
    borderWidth: 1,
    borderColor: c.action.primary,
    maxWidth: "85%",
    alignSelf: "flex-end",
  },
}));
