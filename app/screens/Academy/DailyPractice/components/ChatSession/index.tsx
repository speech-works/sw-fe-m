import React, { useEffect, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenView from "../../../../../components/ScreenView";
import { Gradient, makeStyles, spacing, zIndex } from "../../../../../design-system";
import { ChatThread } from "./ChatThread";
import { InputDock } from "./InputDock";
import type { ChatSessionOption, ChatSessionProps } from "./types";

/** Bottom clearance for the floating dock (pill 70 + ~34 safe margin + gap). */
const DOCK_RESERVE = 120;
/** The bottom fade dissolves scrolling content into the canvas before it reaches the dock. */
const SCRIM_H = DOCK_RESERVE + spacing["4xl"];

/**
 * Shared active-session chat layout for Roleplay, Interview, and Social
 * Challenge. The header scrolls with the conversation (standard PageHeader); the
 * response options render inline as a choice list; and the mic dock FLOATS over
 * the thread. The turn loop lives here: tapping an option arms it, speaking it in
 * the dock advances (`onAdvance`, overwriting only the local recording), and the
 * dialogue's end shows Finish (`onComplete`). Screens keep their own wiring.
 */
export default function ChatSession<O extends ChatSessionOption>({
  title,
  onBack,
  messages,
  options,
  onAdvance,
  onComplete,
}: ChatSessionProps<O>) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();

  const [armedOptionId, setArmedOptionId] = useState<string | null>(null);
  const [turnRecordingUri, setTurnRecordingUri] = useState<string | null>(null);

  // A new turn (or the end) clears any arm + pending take.
  useEffect(() => {
    setArmedOptionId(null);
    setTurnRecordingUri(null);
  }, [options]);

  const armedOption = options.find((o) => o.id === armedOptionId) ?? null;
  const hasOptions = options.length > 0;
  const isEnded = !hasOptions && messages.length > 0;

  const handleArm = (option: O) => {
    setArmedOptionId(option.id);
    setTurnRecordingUri(null); // re-arming drops any half-recorded take
  };

  const handleConfirm = () => {
    if (!armedOption) return;
    onAdvance(armedOption, turnRecordingUri);
    setArmedOptionId(null);
    setTurnRecordingUri(null);
  };

  const handleDiscard = () => setTurnRecordingUri(null);

  return (
    <ScreenView style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={[StyleSheet.absoluteFillObject, styles.canvas]} />

      <ChatThread
        title={title}
        onBack={onBack}
        messages={messages}
        options={options}
        armedOptionId={armedOptionId}
        onArm={handleArm}
        bottomPadding={DOCK_RESERVE}
      />

      {/* Bottom fade — content dissolves into the canvas before it reaches the
          floating dock, so the opaque pill never blends with a bubble behind it. */}
      <View style={styles.dockScrim} pointerEvents="none">
        <Gradient token="scrimDown" style={StyleSheet.absoluteFill} />
      </View>

      {/* Floating dock — absolute over the thread; conversation scrolls behind it. */}
      <View style={styles.dockFloat} pointerEvents="box-none">
        <InputDock
          hasOptions={hasOptions}
          isEnded={isEnded}
          armed={!!armedOption}
          turnRecordingUri={turnRecordingUri}
          onRecorded={setTurnRecordingUri}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
          onComplete={onComplete}
        />
      </View>

      {/* Opaque status-bar cap — hides scrolled content behind the clock/battery. */}
      {insets.top > 0 ? (
        <View style={[styles.statusCap, { height: insets.top }]} />
      ) : null}
    </ScreenView>
  );
}

const useStyles = makeStyles((c) => ({
  screen: {
    paddingBottom: 0,
    backgroundColor: c.background.canvas,
  },
  canvas: {
    backgroundColor: c.background.canvas,
  },
  dockScrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SCRIM_H,
  },
  dockFloat: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },

  statusCap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: c.background.canvas,
    zIndex: zIndex.sticky,
  },
}));
