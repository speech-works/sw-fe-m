import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { MoodType } from "../../../../api/moodCheck/types";
import {
  ExploreStackNavigationProp,
  ExploreStackParamList,
} from "../../../../navigators/stacks/ExploreStack/types";
import { useMoodCheckStore } from "../../../../stores/mood";
import {
  Sheet,
  Text,
  useTheme,
  makeStyles,
  spacing,
  space,
  radius,
} from "../../../../design-system";
import PressableScale from "../../../../components/PressableScale";

// Animated Faces (protected sw-faces — rendered byte-identical).
import AngryFace from "../../../../assets/mood-check/AngryFace";
import CalmFace from "../../../../assets/mood-check/CalmFace";
import HappyFace from "../../../../assets/mood-check/HappyFace";
import SadFace from "../../../../assets/mood-check/SadFace";

import { getLocalTodayDateString } from "../../../../util/functions/date";
import {
  useOnboardingNudgeStore,
  completedOnboardingToday,
} from "../../../../stores/onboardingNudge";
import { hasOpenModalExcept } from "../../../../stores/nativeModal";

/**
 * Not a real registry id — this sheet registers its own under a generated id
 * inside `Sheet`. We only need a value that can never match one, so the check
 * below reads as "is ANY native modal open".
 */
const POPUP_ID = "__mood-check-precheck__";

// The mood-name text sits on `surface.default`. The bright accent BASE hue fails
// AA there on the light "paper" canvas (1.2–1.8:1), so the label uses the darker
// `feedback.*Text` cut (≥5.2:1 both schemes). The tile edge no longer carries the
// accent (below 3:1 on light) — it's a neutral `border.default` resting frame.
type FeedbackTextKey = "successText" | "warningText" | "dangerText" | "infoText";

const emotions: {
  id: MoodType;
  name: string;
  icon: React.ComponentType<any>;
  textKey: FeedbackTextKey;
}[] = [
  { id: MoodType.ANGRY, name: "Angry", icon: AngryFace, textKey: "dangerText" },
  { id: MoodType.CALM, name: "Calm", icon: CalmFace, textKey: "successText" },
  { id: MoodType.HAPPY, name: "Happy", icon: HappyFace, textKey: "warningText" },
  { id: MoodType.SAD, name: "Sad", icon: SadFace, textKey: "infoText" },
];

const MoodCheckPopup = () => {
  const { colors } = useTheme();
  const styles = useStyles();
  const { hasRecordedToday, lastPopupDate, setPopupShown, _hasHydrated } =
    useMoodCheckStore();
  const completedAt = useOnboardingNudgeStore((s) => s.completedAt);
  const exploreNavigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();
  const [visible, setVisible] = React.useState(false);
  // Deferred nav: the sheet closes first, then navigates on full dismissal so it
  // never stacks over the pushed FollowUp screen.
  const pendingMoodRef = useRef<MoodType | null>(null);

  useEffect(() => {
    // Wait for hydration
    if (!_hasHydrated) {
      return;
    }

    // NOT ON THE DAY THEY FINISHED ONBOARDING.
    //
    // Finishing means thirteen questions about the situations they avoid and
    // how much those distress them. They then land on Home and, half a second
    // later, this sheet opens and asks how they are feeling — a second demand
    // on somebody who has just given the app a great deal, on the most
    // fatigued screen in the product.
    //
    // Deliberately a suppression and not a delay: the day is spent, and we ask
    // again tomorrow. Nothing else about the mood check changes, and the
    // banner on Home stays exactly where it is for anyone who wants it.
    if (completedOnboardingToday({ completedAt })) return;

    const today = getLocalTodayDateString();

    // Show if:
    // 1. Not recorded today
    // 2. Popup hasn't been shown today
    if (!hasRecordedToday && lastPopupDate !== today) {
      const timer = setTimeout(() => {
        // STANDS DOWN RATHER THAN QUEUING.
        //
        // `exclusive` on the Sheet below defers-and-then-presents, which is
        // right for a REACTIVE sheet: an error or a confirmation is the answer
        // to something the user just did, and they need it whenever it can be
        // shown. This is a PROACTIVE ask, and deferring one of those turns a
        // collision into a chain — dismiss the first sheet and the next one
        // appears in its place, which is more irritating than either alone and
        // is the surest way to teach somebody to dismiss without reading.
        //
        // So if the moment is taken, we simply do not take it. Nothing is
        // marked as shown, so the next visit to Home tries again at a moment
        // that is actually free. And nothing is lost meanwhile: MoodCheckBanner
        // sits on Home for anyone who wants to record a mood without being
        // asked. A proactive prompt that can be skipped for free should be.
        if (hasOpenModalExcept(POPUP_ID)) return;
        setVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasRecordedToday, lastPopupDate, _hasHydrated, completedAt]);

  const handleSkip = () => {
    setPopupShown(); // Mark as shown for today
    setVisible(false);
  };

  const handleSelectMood = (mood: MoodType) => {
    pendingMoodRef.current = mood;
    setPopupShown();
    setVisible(false);
  };

  return (
    <Sheet
      visible={visible}
      // A BACKSTOP, not the policy. The stand-down above is what normally
      // keeps this out of another sheet's way; `exclusive` covers the race
      // where something opens between that check and this presenting. Without
      // it, two stacked native Modals wedge touch handling app-wide on iOS —
      // a bug we have already chased once, and one this sheet could reach
      // because deference used to run one way: OutcomeModal defers to this,
      // this opened straight over it.
      exclusive
      onClose={handleSkip}
      onDismissed={() => {
        const mood = pendingMoodRef.current;
        pendingMoodRef.current = null;
        if (mood) {
          // @ts-expect-error — nested navigator param types aren't propagated to this screen's nav prop
          exploreNavigation.navigate("ExploreStack", {
            screen: "MoodCheckStack",
            params: { screen: "FollowUpStack", params: { mood } },
          });
        }
      }}
    >
      <View style={styles.content}>
        <Text variant="h2" color="primary">
          How do you feel today?
        </Text>

        <View style={styles.grid}>
          {emotions.map((emo) => (
            <PressableScale
              key={emo.id}
              onPress={() => handleSelectMood(emo.id)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface.default,
                  borderColor: colors.border.default,
                },
              ]}
            >
              <emo.icon width={80} height={80} shouldAnimate={visible} />
              <Text variant="title" color={colors.feedback[emo.textKey]}>
                {emo.name}
              </Text>
            </PressableScale>
          ))}
        </View>
      </View>
    </Sheet>
  );
};

export default React.memo(MoodCheckPopup);

const useStyles = makeStyles(() => ({
  content: {
    gap: space.sectionGap,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.groupGap,
    justifyContent: "space-between",
  },
  // Solid tile (was a washed accent tint) so the colourful faces pop against it;
  // the accent border frames it crisply and carries the mood identity.
  card: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: radius.card,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
}));
