import React, { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Button, Sheet, Text, spacing } from "../design-system";
import { PropsOnly } from "./Pip/PipMomentSpot";
import type { PipMomentSpotHandle } from "./Pip/PipMomentSpot";
import { closeNotificationAsk, useNotificationAskStore } from "../util/functions/notificationAsk";

/** How long the "No problem" line stays before the sheet closes by itself. A tap closes it sooner. */
const NOT_NOW_MS = 3000;

/**
 * The in-app notification ask (P24), mounted once at the root. It opens when askNotificationsNicely() is called.
 * The polite bell alone (no Pip: founder 2026-11-28); the words are under the bell so nothing covers them.
 * "Allow" hands back to the caller, which then shows the phone's dialog. "Not now" never reaches the OS: the bell dozes,
 * the line says where to turn reminders on later, and the sheet closes after a few seconds or on a tap.
 */
const NotificationAsk: React.FC = () => {
  const open = useNotificationAskStore((s) => s.open);
  const answer = useNotificationAskStore((s) => s.answer);
  const setHostMounted = useNotificationAskStore((s) => s.setHostMounted);
  const [declined, setDeclined] = React.useState(false);
  const spot = useRef<PipMomentSpotHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { width } = useWindowDimensions();
  const pipSize = Math.round(Math.min(width * 0.32, 150));

  useEffect(() => {
    setHostMounted(true);
    return () => setHostMounted(false);
  }, [setHostMounted]);
  useEffect(() => {
    if (open) setDeclined(false);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [open]);

  const close = () => {
    if (timer.current) clearTimeout(timer.current);
    closeNotificationAsk();
  };
  const notNow = () => {
    setDeclined(true);
    answer(false);
    void spot.current?.play("not-now");
    timer.current = setTimeout(close, NOT_NOW_MS);
  };
  // A swipe-down or backdrop tap counts as "Not now" while still asking.
  const dismiss = () => (declined ? close() : (answer(false), close()));

  return (
    <Sheet visible={open} onClose={dismiss} exclusive>
      <Pressable disabled={!declined} onPress={close}>
        <View style={styles.body}>
          {/* the polite bell alone, no Pip (founder 2026-11-28) */}
          <View style={{ alignItems: "center" }}>
            <PropsOnly spotRef={spot} moment="permission-ask" variant="ask" size={pipSize} delay={250} />
          </View>
          {declined ? (
            <Text variant="h3" center>No problem. You can turn reminders on in Settings.</Text>
          ) : (
            <>
              <Text variant="h2" center>Can we remind you to practice?</Text>
              <View style={styles.actions}>
                <Button label="Allow" variant="primary" onPress={() => answer(true)} />
                <Button label="Not now" variant="secondary" onPress={notNow} />
              </View>
            </>
          )}
        </View>
      </Pressable>
    </Sheet>
  );
};

export default NotificationAsk;

const styles = StyleSheet.create({
  body: { alignItems: "center", paddingTop: spacing.sm, gap: spacing.md },
  actions: { width: "100%", gap: spacing.sm, marginTop: spacing.xs },
});
