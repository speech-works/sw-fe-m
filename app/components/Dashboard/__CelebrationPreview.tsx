import React, { useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import {
  Button,
  Text,
  Icon,
  icons,
  useTheme,
  spacing,
  space,
  radius,
  borderWidth,
} from "../../design-system";
import PressableScale from "../PressableScale";
import OnboardingCelebration from "../../screens/Onboarding/OnboardingCelebration";

/**
 * ⚠️ TEMPORARY DEV PREVIEW — remove before shipping.
 *
 * A Home button that opens the onboarding "You're all set!" celebration in a
 * full-screen modal, so it can be reviewed without re-running onboarding.
 * "Replay" re-mounts the celebration to re-trigger the entrance animation.
 *
 * To remove: delete this file, its import in Home, and the <CelebrationPreview />
 * line there.
 */
const CelebrationPreview: React.FC = () => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  // Changing the key remounts OnboardingCelebration → the entrance plays again.
  const [replayKey, setReplayKey] = useState(0);

  return (
    <>
      <PressableScale
        scaleTo={0.98}
        onPress={() => {
          setReplayKey((k) => k + 1);
          setOpen(true);
        }}
        style={[
          styles.devBtn,
          {
            borderColor: colors.border.strong,
            backgroundColor: colors.surface.control,
          },
        ]}
      >
        <Icon name={icons.roadmap} size={16} color={colors.text.secondary} />
        <Text variant="label" color="secondary">
          Preview: celebration screen (dev)
        </Text>
      </PressableScale>

      <Modal
        visible={open}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={[styles.screen, { backgroundColor: colors.background.canvas }]}
        >
          <View style={styles.body}>
            <Text variant="display">You&apos;re all set!</Text>
            <Text variant="body" color="secondary">
              Here&apos;s what we&apos;d start with, based on what you told us.
            </Text>

            <OnboardingCelebration key={replayKey} />
          </View>

          <View style={styles.footer}>
            <Button
              label="Replay animation"
              variant="secondary"
              onPress={() => setReplayKey((k) => k + 1)}
            />
            <Button label="Close" variant="ghost" onPress={() => setOpen(false)} />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default CelebrationPreview;

const styles = StyleSheet.create({
  devBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.inlineGap,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: borderWidth.thin,
    borderStyle: "dashed",
  },
  screen: {
    flex: 1,
    paddingHorizontal: space.screenX,
    paddingTop: spacing["6xl"],
    paddingBottom: spacing["2xl"],
  },
  body: {
    flex: 1,
    justifyContent: "center",
    gap: space.sectionGap,
  },
  footer: {
    gap: space.rowGap,
  },
});
