import React from "react";
import { StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenView from "../../components/ScreenView";
import {
  Button,
  Icon,
  icons,
  SchemeStatusBar,
  Text,
  space,
  spacing,
  radius,
  useTheme,
} from "../../design-system";
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
import { SITUATION_PHRASE } from "../../constants/onboardingActOne";

/** "phone calls, meeting new people and interviews" — an Oxford-comma-free list. */
function joinPhrases(list: string[]): string {
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`;
}

/**
 * The last screen before signup.
 *
 * THIS SCREEN DOES NOT SELL. It says their own words back to them, and that is
 * the entire job. Naming a program or a price here would change the question in
 * the reader's head from "they understood me" to "do I want to buy this" — and
 * the second question is a much worse one to be asking someone who has known us
 * for sixty seconds. The goal of Act 1 is a signup made WITH INTENT; the buying
 * decision belongs later, once there is a real, priced, personalised match to
 * decide about.
 *
 * So the absence of a price here is the design, not a gap to be closed. Do not
 * "improve" this screen by adding one.
 *
 * (There is a second, independent reason it would also be unsafe: the real
 * match comes from `GET /users/me/offers`, which requires an account, so
 * computing one here would mean duplicating the ranking and the pricing into
 * the app where they can drift and quote a number we do not charge —
 * `app/util/packs/offers.ts` opens with the story of that exact bug. If that
 * endpoint were ever opened up, the product reason above still stands on its
 * own.)
 */
const ActOneTeaser: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const answers = useOnboardingDraftStore((s) => s.answers);

  const raw = answers["speech.situations"];
  const chosen = Array.isArray(raw) ? raw : raw ? [raw] : [];
  // NONE / NOT_SURE carry no targeting information, so they are never echoed.
  const phrases = chosen
    .map((v) => SITUATION_PHRASE[String(v)])
    .filter(Boolean) as string[];

  const named = joinPhrases(phrases.slice(0, 3));

  return (
    <ScreenView style={styles.screen}>
      <SchemeStatusBar />

      <View style={styles.body}>
        <Text variant="display">
          {named ? "That's a good place to start." : "Good start."}
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface.default,
              borderColor: colors.border.default,
            },
          ]}
        >
          <View style={styles.cardHead}>
            <Icon name={icons.roadmap} size={18} color={colors.action.primary} />
            <Text variant="label" color={colors.action.primary}>
              WHAT WE&apos;D START WITH
            </Text>
          </View>

          {named ? (
            <Text variant="h3" color="primary">
              You said {named} feel hardest. That&apos;s exactly what
              we&apos;d build your first plan around.
            </Text>
          ) : (
            <Text variant="h3" color="primary">
              We&apos;ll start with the everyday moments that feel hardest, and
              build from there.
            </Text>
          )}

          <Text variant="bodySm" color="secondary">
            Create an account and your plan is waiting on the other side.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          label="Create an account"
          onPress={() => navigation.navigate("Auth")}
        />
      </View>
    </ScreenView>
  );
};

export default ActOneTeaser;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 0,
  },
  body: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: space.screenX,
    gap: space.sectionGap,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.xl,
    gap: space.inlineGap,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  footer: {
    paddingHorizontal: space.screenX,
    paddingBottom: spacing["2xl"],
  },
});
