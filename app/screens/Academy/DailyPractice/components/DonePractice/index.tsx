import { useNavigation } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import ConfettiAnimation from "../../../../../components/ConfettiAnimation";
import ScreenView from "../../../../../components/ScreenView";
import { ROUTE_NAMES } from "../../../../../constants/routes";
import {
  useTheme,
  useSuccessPop,
  spacing,
  radius,
  Text,
  Button,
  Icon,
  icons,
} from "../../../../../design-system";
import Reminder from "../Reminder";
import { mapPracticeToCategory } from "../../../../../constants/reminderTemplates";
import { getMyBuddy } from "../../../../../api/buddies";
import { PracticeActivityContentType } from "../../../../../api/practiceActivities/types";
import { activityKindFromContentType } from "../../../../../util/functions/post";

interface DonePracticeProps {
  practiceName?: string;
  onDone?: () => void;
  isAborted?: boolean;
  from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  /** The completed activity — enables sharing it as a card-post (when paired). */
  activityId?: string;
  contentType?: PracticeActivityContentType;
}

const DonePractice = ({
  practiceName = "practice",
  onDone,
  isAborted = false,
  from,
  activityId,
  contentType,
}: DonePracticeProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [hasBuddy, setHasBuddy] = useState(false);
  const [hasShared, setHasShared] = useState(false);

  // Subtle entrance for the status disc — bouncy celebration when completed,
  // a gentler settle when the session was ended early. Reduced-motion aware.
  const discPop = useSuccessPop(true, { celebrate: !isAborted });

  useEffect(() => {
    if (isAborted) return;
    getMyBuddy()
      .then((s) => setHasBuddy(s.link?.status === "active"))
      .catch(() => { }); // silently ignore — default is show the button
  }, [isAborted]);

  return (
    <ScreenView style={styles.screen}>
      <StatusBar barStyle="light-content" />

      {/* Dark canvas (replaces the legacy light gradient background). */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background.canvas }]} />

      {/* Confetti (Only if completed) — bright saturated hues read on the dark canvas. */}
      {!isAborted && <ConfettiAnimation />}

      <View style={styles.content}>
        {/* Status disc — green success on completion, a calm neutral disc when aborted. */}
        <Animated.View
          style={[
            styles.disc,
            {
              backgroundColor: isAborted ? colors.surface.elevated : colors.accent.success,
            },
            discPop,
          ]}
        >
          <Icon
            name={isAborted ? icons.affirmation : icons.success}
            size={isAborted ? 50 : 60}
            color={isAborted ? colors.text.secondary : colors.accentOn.success}
          />
        </Animated.View>

        {/* Success / Encouraging Text */}
        <View style={styles.textContainer}>
          <Text variant="h1" color="primary" center>
            {isAborted ? "That's okay." : "Great Job!"}
          </Text>
          <Text variant="body" color="secondary" center style={styles.descText}>
            {isAborted
              ? `Every effort is a step forward. You can always return to your ${practiceName} when you feel ready.`
              : `You've completed your daily ${practiceName}. Keep up the momentum!`}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionContainer}>
          {/* 1a. Share this session as a post — shown when paired */}
          {!isAborted && hasBuddy && !!activityId && from !== "MOOD_CHECK" && !hasShared && (
            <Button
              variant="secondary"
              label="Share this session"
              leftIcon={icons.share}
              onPress={() =>
                navigation.navigate("PracticeComposer", {
                  activityId,
                  activityKind: activityKindFromContentType(contentType),
                  activityName: practiceName,
                  onShared: () => setHasShared(true),
                })
              }
            />
          )}

          {/* 1b. Invite buddy — top, hidden when already paired or aborted */}
          {!isAborted && !hasBuddy && from !== "MOOD_CHECK" && (
            <Button
              variant="secondary"
              label="Invite a Practice Buddy"
              leftIcon={icons.addPerson}
              onPress={() =>
                navigation.navigate("Root", {
                  screen: ROUTE_NAMES.COMMUNITY,
                })
              }
            />
          )}

          {/* 2. Set Reminder — middle */}
          {from !== "MOOD_CHECK" && (
            <Reminder
              suggestedCategory={mapPracticeToCategory(practiceName)}
              renderTrigger={(onOpen) => (
                <Button
                  variant="secondary"
                  label="Set Reminder"
                  leftIcon={icons.reminder}
                  onPress={onOpen}
                />
              )}
            />
          )}

          {/* 3. Primary CTA — always at the bottom */}
          {from === "MOOD_CHECK" ? (
            <>
              <Button
                variant="secondary"
                label="Explore More"
                leftIcon={icons.explore}
                onPress={() => {
                  navigation.navigate("Root", {
                    screen: ROUTE_NAMES.EXPLORE,
                    params: { screen: "Explore", params: { scrollToJumpIn: true } },
                  });
                }}
              />
              <Button
                variant="primary"
                label="Back to Home"
                rightIcon={icons.home}
                onPress={() => {
                  navigation.navigate("Root", {
                    screen: ROUTE_NAMES.HOME,
                  });
                }}
              />
            </>
          ) : onDone ? (
            <Button
              variant="primary"
              label="Done"
              rightIcon={icons.success}
              onPress={onDone}
            />
          ) : (
            <Button
              variant="primary"
              label="Explore More"
              rightIcon={icons.explore}
              onPress={() => {
                navigation.navigate("Root", {
                  screen: ROUTE_NAMES.EXPLORE,
                  params: { screen: "Explore", params: { scrollToJumpIn: true } },
                });
              }}
            />
          )}
        </View>
      </View>
    </ScreenView>
  );
};

export default DonePractice;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing["3xl"],
    gap: spacing["4xl"],
  },
  disc: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
    gap: spacing.md,
  },
  descText: {
    lineHeight: 24,
  },
  actionContainer: {
    width: "100%",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
