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
  SemanticColors,
} from "../../../../design-system";
import PressableScale from "../../../../components/PressableScale";

// Animated Faces (protected sw-faces — rendered byte-identical).
import AngryFace from "../../../../assets/mood-check/AngryFace";
import CalmFace from "../../../../assets/mood-check/CalmFace";
import HappyFace from "../../../../assets/mood-check/HappyFace";
import SadFace from "../../../../assets/mood-check/SadFace";

import { getLocalTodayDateString } from "../../../../util/functions/date";

type AccentKey = keyof SemanticColors["accent"];

const emotions: {
  id: MoodType;
  name: string;
  icon: React.ComponentType<any>;
  accentKey: AccentKey;
}[] = [
  { id: MoodType.ANGRY, name: "Angry", icon: AngryFace, accentKey: "danger" },
  { id: MoodType.CALM, name: "Calm", icon: CalmFace, accentKey: "success" },
  { id: MoodType.HAPPY, name: "Happy", icon: HappyFace, accentKey: "warning" },
  { id: MoodType.SAD, name: "Sad", icon: SadFace, accentKey: "info" },
];

const MoodCheckPopup = () => {
  const { colors } = useTheme();
  const styles = useStyles();
  const { hasRecordedToday, lastPopupDate, setPopupShown, _hasHydrated } =
    useMoodCheckStore();
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

    const today = getLocalTodayDateString();

    // Show if:
    // 1. Not recorded today
    // 2. Popup hasn't been shown today
    if (!hasRecordedToday && lastPopupDate !== today) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasRecordedToday, lastPopupDate, _hasHydrated]);

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
                  borderColor: colors.accent[emo.accentKey],
                },
              ]}
            >
              <emo.icon width={80} height={80} shouldAnimate={visible} />
              <Text variant="title" color={colors.accent[emo.accentKey]}>
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
