import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useEventStore } from "../stores/events";
import { EVENT_NAMES } from "../stores/events/constants";
import {
  useTheme,
  spacing,
  radius,
  Text,
  Button,
  Icon,
  icons,
  Sheet,
  useSuccessPop,
} from "../design-system";

/** Global success/error confirmation. Rendered once at the app root; driven by the
 *  event store. Now a dark DS Sheet (valence accent disc + "Got it"). NOTE: never show
 *  this while another Sheet/Modal is open — close that first, then fire the event
 *  (two stacked native Modals wedge touch handling on iOS). */
const OutcomeModal = () => {
  const { colors } = useTheme();
  const { events, clear } = useEventStore();
  const [visible, setVisible] = useState(false);
  const [type, setType] = useState<"error" | "success">("success");
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!events || events.length === 0) return;

    for (const event of events) {
      if (
        event.name === EVENT_NAMES.SHOW_ERROR_MODAL ||
        event.name === EVENT_NAMES.SHOW_SUCCESS_MODAL
      ) {
        const kind =
          event.name === EVENT_NAMES.SHOW_SUCCESS_MODAL ? "success" : "error";

        const nextTitle =
          event.detail?.modalTitle ||
          event.detail?.title ||
          (kind === "error" ? "Something went wrong" : "Success");
        const nextMessage =
          event.detail?.errorMessage ||
          event.detail?.message ||
          event.detail?.desc ||
          "";
        const nextTag = event.detail?.modalTag || event.detail?.tag || "";

        setType(kind);
        setTitle(nextTitle);
        setTag(nextTag);
        setMessage(nextMessage);
        setVisible(true);
        clear(event.name);
      }
    }
  }, [events, clear]);

  const success = type === "success";
  // Bright valence disc with the AA-correct dark glyph (same pattern as ShareMoment).
  const accent = success ? colors.accent.success : colors.accent.danger;
  const accentOn = success ? colors.accentOn.success : colors.accentOn.danger;
  // Disc scales in each time the sheet opens — celebratory bounce for success,
  // a calm settle for errors (bounce stays reserved for celebration).
  const discStyle = useSuccessPop(visible, { celebrate: success });

  return (
    <Sheet visible={visible} onClose={() => setVisible(false)}>
      <View style={styles.body}>
        <Animated.View style={[styles.iconDisc, { backgroundColor: accent }, discStyle]}>
          <Icon name={success ? icons.success : icons.danger} size={28} color={accentOn} />
        </Animated.View>
        <Text variant="h2" center>{title}</Text>
        {tag ? (
          <Text variant="label" color="tertiary" center style={styles.tag}>{tag}</Text>
        ) : null}
        {message ? (
          <Text variant="bodySm" color="secondary" center>{message}</Text>
        ) : null}
        <View style={styles.action}>
          <Button label="Got it" variant="primary" onPress={() => setVisible(false)} />
        </View>
      </View>
    </Sheet>
  );
};

export default OutcomeModal;

const styles = StyleSheet.create({
  body: {
    alignItems: "center",
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  iconDisc: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  tag: { letterSpacing: 1 },
  action: { width: "100%", marginTop: spacing.xs },
});
