import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import {
  abortPracticeActivity,
  completePracticeActivity,
} from "../../api";
import { WS_BASE_URL } from "../../api/constants";
import { FirstCallOffer, fetchFirstCallOffer } from "../../api/firstCall";
import { PracticeActivityContentType } from "../../api/practiceActivities/types";
import { postAiCallConsent } from "../../api/users";
import AICallConsentModal from "../../components/AICallConsentModal";
import CallingWidget from "../../components/CallingWidget";
import {
  Screen,
  Spinner,
  Text,
  Button,
  makeStyles,
  space,
  spacing,
} from "../../design-system";
import { useMarkActivityStart } from "../../hooks/useMarkActivityStart";
import { useActivityStore } from "../../stores/activity";
import { useAICallConsentStore } from "../../stores/aiCallConsent";
import { useFirstCallStore } from "../../stores/firstCall";
import { useUserStore } from "../../stores/user";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";
import { track } from "../../util/analytics/postHog";
import AfterCall, { AfterCallFeeling } from "./AfterCall";
import HeadphoneGate from "./HeadphoneGate";
import RingingScreen from "./RingingScreen";

const RINGING_SOUND_FILE = require("../../assets/sounds/dial-tone_us.wav");

/**
 * ============================================================================
 * THE ONCE-IN-A-LIFETIME FIRST CALL
 * ----------------------------------------------------------------------------
 * Every user gets exactly one AI call, ever, free, matched to the act they
 * named as hardest in onboarding — and it RINGS rather than waiting to be
 * dialled, because deciding to make a call is very often the hardest part of
 * making one.
 *
 * ── THE RULE THIS SCREEN EXISTS TO KEEP ─────────────────────────────────────
 * THE OFFER IS SPENT ONLY WHEN A CALL ACTUALLY CONNECTS. Not when it is shown,
 * declined, postponed, or blocked for want of headphones.
 *
 * Every phase before `live` is therefore free to abandon: nothing is created
 * server-side until `onCallStart` fires inside the widget, which happens after
 * Answer and after the widget's own headset check. Leaving at any earlier
 * point is a no-op the user can undo simply by coming back.
 *
 * There is no second attempt to fall back on and no error state that means
 * anything to a first-time user, so every failure here routes somewhere warm:
 * a technical problem sends them back with the offer intact (the server hands
 * the call back on a vendor error), never to a red screen.
 *
 * ── PHASES ──────────────────────────────────────────────────────────────────
 *   loading   → who is calling?
 *   gate      → headphones, because calls only work on them today
 *   ringing   → an incoming call, with a free decline
 *   live      → the call itself (CallingWidget, auto-answered)
 *   aftercare → "how do you feel?", and a minute of breathing if it was a lot
 * ============================================================================
 */

type Phase =
  | "loading"
  | "gate"
  | "ringing"
  | "live"
  | "aftercare"
  | "failed"
  | "gone";

const FirstCall = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const styles = useStyles();
  const { user } = useUserStore();
  const { updateActivity } = useActivityStore();

  // Home already has the offer when it renders the card, so it hands it over
  // rather than making the user watch a spinner for something we know.
  const seeded: FirstCallOffer | undefined = route.params?.offer;
  const [offer, setOffer] = useState<FirstCallOffer | null>(seeded ?? null);
  const [phase, setPhase] = useState<Phase>(seeded?.scenario ? "gate" : "loading");

  const [activityId, setActivityId] = useState<string | null>(null);
  const activityIdRef = useRef<string | null>(null);
  const gateAttempts = useRef(0);
  /**
   * Did a call genuinely connect?
   *
   * The after-call screen opens with "You took the call" — which must never
   * appear to somebody whose call never started. A start that fails (no
   * session, a 500, the socket refusing) still ends up in `onCallEnd`, and
   * congratulating them for a call that did not happen is both a lie and,
   * because they can plainly see it did not happen, unsettling.
   */
  const connectedRef = useRef(false);

  const defer = useFirstCallStore((s) => s.defer);
  const markNoHeadphones = useFirstCallStore((s) => s.markNoHeadphones);
  const clearDeferral = useFirstCallStore((s) => s.clearDeferral);

  const scenario = offer?.scenario;
  const callerName = scenario?.callerName || "Someone";
  const action = scenario?.action ?? null;

  const trackActivityId = (id: string | null) => {
    activityIdRef.current = id;
    setActivityId(id);
  };

  // One-time disclosure before ANY AI conversation: voice is streamed to a
  // third-party AI partner. Same gate the ordinary call screen uses — a first
  // call is not an exemption from it.
  const aiConsented = useAICallConsentStore((s) => s.consented);
  const markAICallConsented = useAICallConsentStore((s) => s.markConsented);
  const [consentHydrated, setConsentHydrated] = useState(
    useAICallConsentStore.persist.hasHydrated(),
  );
  useEffect(() => {
    const unsub = useAICallConsentStore.persist.onFinishHydration(() =>
      setConsentHydrated(true),
    );
    return unsub;
  }, []);
  const needsConsent =
    consentHydrated && !aiConsented && !user?.aiCallConsentAt;

  useEffect(() => {
    if (seeded?.scenario) return;
    let alive = true;
    (async () => {
      const fresh = await fetchFirstCallOffer();
      if (!alive) return;
      setOffer(fresh);
      setPhase(fresh.available && fresh.scenario ? "gate" : "gone");
    })();
    return () => {
      alive = false;
    };
  }, [seeded]);

  useEffect(() => {
    if (phase === "gate" && scenario) {
      // Coming through the door at all clears any earlier "not now" — they are
      // back, so the offer should be loud again if they leave without taking it.
      clearDeferral();
      track(ANALYTICS_EVENTS.FIRST_CALL_OPENED, { action });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "gate", scenario?.activityId]);

  const leave = useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Root", { screen: "HOME" });
  }, [navigation]);

  /**
   * Creates and starts the practice activity — THE MOMENT THE OFFER IS SPENT.
   *
   * Called by the widget once the user has answered and its own headset check
   * has passed, so by the time this runs a call is genuinely being placed.
   * Errors are swallowed into `null`, which the widget treats as "do not
   * connect"; the server never marked anything, so the offer survives.
   */
  const markActivityStart = useMarkActivityStart({
    contentType: PracticeActivityContentType.EXPOSURE_PRACTICE,
    contentId: scenario?.activityId,
    contentTitle: scenario ? `First call — ${scenario.callerName}` : undefined,
    initialActivity: undefined,
    packContext: undefined,
    currentActivityId: activityId,
    setActivityId: trackActivityId,
    navigation,
    logTag: "FirstCall",
  });

  const handleCallStart = async (): Promise<string | null> => {
    const id = await markActivityStart();
    if (id) {
      connectedRef.current = true;
      track(ANALYTICS_EVENTS.FIRST_CALL_CONNECTED, { action });
    }
    return id;
  };

  const handleCallEnd = async ({
    shouldComplete,
    reason,
  }: {
    shouldComplete: boolean;
    reason: string | null;
  }) => {
    if (reason === "limit_reached") return;

    const id = activityIdRef.current;
    track(ANALYTICS_EVENTS.FIRST_CALL_ENDED, {
      action,
      completed: shouldComplete,
      reason,
    });
    if (!connectedRef.current || !id) {
      // It never connected, so there is nothing to close out and nothing to
      // congratulate. The server marked nothing either — the call is still
      // theirs — so this goes somewhere that says so, rather than to the
      // after-call screen, which would claim something that did not happen.
      setPhase("failed");
      return;
    }

    try {
      if (shouldComplete) {
        // No vitals modal here on purpose. The ordinary call screen asks for
        // effort/accuracy ratings; asking a first-timer to score themselves
        // seconds after their first call turns it back into a test, and the
        // caller was under orders never to mention how they spoke.
        const completed = await completePracticeActivity({
          id,
          userId: user?.id ?? "",
        });
        updateActivity(id, { ...completed });
      } else {
        const aborted = await abortPracticeActivity({
          id,
          userId: user?.id ?? "",
          // Our fault → the server hands the call back. Their choice to hang
          // up → it stays spent, which is correct: it connected.
          refundResources: reason === "technical_difficulty" || reason === null,
        });
        updateActivity(id, { ...aborted });
      }
    } catch (err) {
      console.warn("[FirstCall] Could not close out the activity", err);
    } finally {
      useUserStore.getState().fetchUser();
      trackActivityId(null);
      setPhase("aftercare");
    }
  };

  const handleCallEndAcknowledged = async ({
    reason,
  }: {
    reason: string | null;
  }) => {
    if (reason !== "limit_reached") return;
    const id = activityIdRef.current;
    if (id) {
      try {
        const completed = await completePracticeActivity({
          id,
          userId: user?.id ?? "",
        });
        updateActivity(id, { ...completed });
      } catch (err) {
        console.warn("[FirstCall] Could not complete after limit", err);
      }
    }
    useUserStore.getState().fetchUser();
    trackActivityId(null);
    setPhase("aftercare");
  };

  if (phase === "loading") {
    return (
      <Screen>
        <View style={styles.centered}>
          <Spinner />
        </View>
      </Screen>
    );
  }

  // The call never connected. Our problem, said as ours, and — the part that
  // matters — the call is still theirs. Somebody whose one shot appeared to
  // evaporate needs to be told plainly that it did not.
  if (phase === "failed") {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text variant="h2" color="primary" center>
            That didn't go through
          </Text>
          <Text variant="body" color="secondary" center style={styles.goneLine}>
            Something on our side dropped the call before it started, so it
            doesn't count. {callerName} will try again whenever you're ready.
          </Text>
          <Button label="Back" variant="primary" onPress={leave} />
        </View>
      </Screen>
    );
  }

  // Nothing to offer — taken already, or no content. Said plainly, with a way
  // out, rather than an error.
  if (phase === "gone" || !scenario) {
    return (
      <Screen>
        <View style={styles.centered}>
          <Text variant="h2" color="primary" center>
            {offer?.reason === "already_taken"
              ? "You've had your first call"
              : "Not right now"}
          </Text>
          <Text variant="body" color="secondary" center style={styles.goneLine}>
            {offer?.reason === "already_taken"
              ? "There are plenty more waiting in your practice — those ones you start yourself."
              : "We couldn't set this up just now. Nothing's been used — try again in a bit."}
          </Text>
          <Button label="Back" variant="ghost" onPress={leave} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={["top", "bottom"]} padded={false}>
      {phase === "gate" && (
        <HeadphoneGate
          callerName={callerName}
          onReady={() => {
            gateAttempts.current += 1;
            track(ANALYTICS_EVENTS.FIRST_CALL_GATE_PASSED, {
              attempts: gateAttempts.current,
            });
            track(ANALYTICS_EVENTS.FIRST_CALL_RINGING, { action });
            setPhase("ringing");
          }}
          onDefer={() => {
            track(ANALYTICS_EVENTS.FIRST_CALL_GATE_DEFERRED, {
              reason: "later",
              attempts: gateAttempts.current,
            });
            defer();
            leave();
          }}
          onNoHeadphones={() => {
            track(ANALYTICS_EVENTS.FIRST_CALL_GATE_DEFERRED, {
              reason: "no_headphones",
              attempts: gateAttempts.current,
            });
            markNoHeadphones();
            leave();
          }}
        />
      )}

      {phase === "ringing" && (
        <RingingScreen
          callerName={callerName}
          callerDesignation={scenario.callerDesignation}
          icon={scenario.icon}
          onAnswer={() => {
            track(ANALYTICS_EVENTS.FIRST_CALL_ANSWERED, { action });
            setPhase("live");
          }}
          onDecline={() => {
            track(ANALYTICS_EVENTS.FIRST_CALL_DECLINED, { action });
            // Declining is free and the offer is untouched, so this is a
            // "remind me later", not a refusal.
            defer();
            leave();
          }}
        />
      )}

      {phase === "live" && (
        <View style={styles.live}>
          <CallingWidget
            userId={user?.id || ""}
            websocketUrl={WS_BASE_URL || ""}
            scenarioId={scenario.activityId}
            scenarioIcon={scenario.icon || "user"}
            agentName={callerName}
            agentDesignation={scenario.callerDesignation}
            ringtoneAsset={RINGING_SOUND_FILE}
            autoStart
            onCallStart={handleCallStart}
            onCallEnd={handleCallEnd}
            onCallEndAcknowledged={handleCallEndAcknowledged}
          />
        </View>
      )}

      {phase === "aftercare" && (
        <AfterCall
          callerName={callerName}
          onBreathe={() => {
            track(ANALYTICS_EVENTS.FIRST_CALL_FEELING, { feeling: "alot" });
            track(ANALYTICS_EVENTS.FIRST_CALL_BREATHING_TAKEN);
            navigation.replace("ExploreStack", {
              screen: "Breathing",
              params: { from: "HOME" },
            });
          }}
          onFinish={(feeling: AfterCallFeeling | null) => {
            track(ANALYTICS_EVENTS.FIRST_CALL_FEELING, { feeling });
            leave();
          }}
        />
      )}

      <AICallConsentModal
        visible={needsConsent && phase === "gate"}
        onAcknowledge={() => {
          markAICallConsented();
          postAiCallConsent().catch(() => {});
        }}
        onDecline={leave}
      />
    </Screen>
  );
};

export default FirstCall;

const useStyles = makeStyles(() => ({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: space.screenX,
  },
  goneLine: {
    marginBottom: spacing.md,
  },
  live: {
    flex: 1,
  },
}));
