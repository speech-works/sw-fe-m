import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FA5Icon from "react-native-vector-icons/FontAwesome5";
import { CallerPreview, fetchCallerPreviews } from "../../api/firstCall";
import ScreenView from "../../components/ScreenView";
import {
  Button,
  Icon,
  SchemeStatusBar,
  Text,
  icons,
  space,
  spacing,
  useMotion,
  useTheme,
} from "../../design-system";
import { SITUATION_PHRASE } from "../../constants/onboardingActOne";
import { useFirstCallStore } from "../../stores/firstCall";
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { track } from "../../util/analytics/postHog";

/**
 * ============================================================================
 * "MAYA WOULD LIKE TO CALL YOU" — the last screen before signup
 * ----------------------------------------------------------------------------
 * Act 1 earns a signup by showing we listened. This screen asks for one by
 * offering something worth having, and it is deliberately the only thing
 * standing between the questions and the account.
 *
 * WHY IT INTRIGUES, WITHOUT LYING:
 *   · It names a PERSON. "A free AI call" is a feature; "Maya, a friend of a
 *     friend, would like to call you" is an event with somebody in it.
 *   · It names THEIR OWN hardest moment, in their words, seconds after they
 *     typed it — the proof we were listening.
 *   · It removes the part they dread: they are not dialling, they are picking
 *     up. Deciding to make a call is very often the hardest part of one.
 *   · It promises the thing nobody promises them: nobody will mention how they
 *     sound.
 *   · It is genuinely once. Scarcity that happens to be true.
 *
 * WHAT IT DOES NOT DO: it does not fake a ringing phone to bait a signup. The
 * phone rings AFTER the account exists, and this screen says so plainly. A
 * ring that turns out to be a login wall is a trick, and a person who has just
 * been told "nobody here will judge how you speak" is the last person to play
 * one on.
 *
 * NOTHING PERSONAL LEAVES THE DEVICE. The caller is chosen locally from the
 * public `GET /callers` cast using answers that stay put — the promise
 * `stores/onboardingDraft` makes and the reason this is not a lookup.
 * ============================================================================
 */

/** Mirrors the server's own preference: the act they meet MOST, else the first
 *  one they called hardest. Same order, so the name here is the name that
 *  rings. */
function targetAct(answers: Record<string, string | string[]>): string | null {
  const real = (v: unknown): v is string =>
    typeof v === "string" && v !== "none" && v !== "not_sure";

  const freq = answers["situation.most_frequent"];
  if (real(freq)) return freq;

  const raw = answers["speech.situations"];
  const picked = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return picked.find(real) ?? null;
}

const ActOneCallOffer: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const motion = useMotion();
  const { colors } = useTheme();

  const answers = useOnboardingDraftStore((s) => s.answers);
  const acceptPreSignup = useFirstCallStore((s) => s.acceptPreSignup);

  const [cast, setCast] = useState<CallerPreview[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchCallerPreviews().then((c) => alive && setCast(c));
    return () => {
      alive = false;
    };
  }, []);

  const act = useMemo(() => targetAct(answers), [answers]);

  const caller = useMemo(() => {
    if (!cast?.length) return null;
    return (
      (act ? cast.find((c) => c.action === act) : undefined) ??
      cast.find((c) => c.isDefault) ??
      cast[0]
    );
  }, [cast, act]);

  useEffect(() => {
    if (caller) {
      track(ANALYTICS_EVENTS.FIRST_CALL_PRESIGNUP_SHOWN, {
        action: act,
        callerName: caller.callerName,
      });
    }
  }, [caller, act]);

  const toAuth = () => navigation.navigate("Auth");

  // The cast could not be fetched (offline, or the endpoint is down). Rather
  // than an apology for a feature they have never heard of, this simply is not
  // offered — they go on to signup, and Home offers the call later exactly as
  // it does for anyone who says "not now" here. Nothing is lost.
  useEffect(() => {
    if (cast !== null && !caller) navigation.replace("Auth");
  }, [cast, caller, navigation]);

  if (!caller) return null;

  const phrase = act ? SITUATION_PHRASE[act] : null;

  return (
    <ScreenView style={styles.screen}>
      <SchemeStatusBar />

      <View style={[styles.body, { paddingTop: insets.top + spacing.lg }]}>
        <Animated.View entering={motion.stagger(0)} style={styles.avatarRow}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: colors.accentTint.purple },
            ]}
          >
            <FA5Icon
              solid
              name={caller.icon || "user"}
              size={30}
              color={colors.accentText.purple}
            />
          </View>
        </Animated.View>

        <View style={styles.copyBlock}>
          <Animated.View entering={motion.stagger(1)}>
            {/* The person, named, wanting something from THEM. */}
            <Text variant="screenTitle" style={styles.headline}>
              {caller.callerName} would{"\n"}like to call you.
            </Text>
          </Animated.View>

          <Animated.View entering={motion.stagger(2)}>
            <Text variant="h3" color="secondary">
              {caller.callerDesignation}
              {phrase ? `. About ${phrase} — the bit you just told us is hardest.` : "."}
            </Text>
          </Animated.View>
        </View>

        {/* Three lines, and each one removes a specific reason to say no. */}
        <View style={styles.promises}>
          {[
            "You don't dial. The phone rings, and you pick up.",
            "Nothing to prepare and nothing to read first.",
            "Nobody will mention how you sound.",
          ].map((line, i) => (
            <Animated.View
              key={line}
              entering={motion.stagger(3 + i)}
              style={styles.promiseRow}
            >
              <Icon
                name={icons.success}
                size={16}
                color={colors.accentText.purple}
              />
              <Text variant="body" color="secondary" style={styles.promiseText}>
                {line}
              </Text>
            </Animated.View>
          ))}
        </View>
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.md },
        ]}
      >
        <Animated.View entering={motion.stagger(6)} style={styles.footerInner}>
          {/* Said BEFORE the tap, not discovered after it. The account comes
              first; the ringing is real and it is next. */}
          <Text variant="bodySm" color="tertiary" center>
            One conversation, once — we'll set your account up first, then
            {" "}
            {caller.callerName} rings.
          </Text>
          <Button
            label="I'll take the call"
            onPress={() => {
              track(ANALYTICS_EVENTS.FIRST_CALL_PRESIGNUP_ACCEPTED, {
                action: act,
                callerName: caller.callerName,
              });
              acceptPreSignup();
              toAuth();
            }}
          />
          <Button
            label="Not right now"
            variant="ghost"
            onPress={() => {
              track(ANALYTICS_EVENTS.FIRST_CALL_PRESIGNUP_DECLINED, {
                action: act,
              });
              // Declining here takes nothing away: Home offers it afterwards,
              // exactly as it does today.
              toAuth();
            }}
          />
        </Animated.View>
      </View>
    </ScreenView>
  );
};

export default ActOneCallOffer;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: space.screenX,
    justifyContent: "center",
    gap: spacing.xl,
  },
  avatarRow: {
    alignItems: "flex-start",
  },
  avatar: {
    height: 76,
    width: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  copyBlock: {
    gap: space.titleSub,
  },
  headline: {
    // Hard-broken to two lines so the lockup matches the teaser's "We can work
    // / with that." — the screens read as one sequence.
  },
  promises: {
    gap: spacing.md,
  },
  promiseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  promiseText: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: space.screenX,
  },
  footerInner: {
    gap: spacing.sm,
  },
});
