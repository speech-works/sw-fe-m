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
  IconButton,
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
import { useOnboardingDraftStore } from "../../stores/onboardingDraft";
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

/** How long to wait for the Act 1 replay before asking anyway. */
const REPLAY_WAIT_MS = 6000;

type Phase =
  | "loading"
  | "gate"
  | "ringing"
  | "live"
  | "aftercare"
  | "failed"
  | "gone";

interface FirstCallProps {
  /**
   * Rendered as its own navigator, straight after signup, for somebody who
   * accepted the call BEFORE they had an account — rather than reached here
   * from Home.
   *
   * The difference is that there is no app behind this screen yet: no tab bar
   * to go back to and no ExploreStack to send them to. So `standalone` swaps
   * every "leave" for a callback the host owns, and the host uses it to hand
   * them on to the rest of onboarding.
   */
  standalone?: boolean;
  /** Standalone only: the flow is over, by any route including failure. */
  onFinished?: () => void;
}

const FirstCall: React.FC<FirstCallProps> = ({ standalone, onFinished }) => {
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
  /**
   * The same fact as `connectedRef`, in state, because the escape hatch below
   * has to RENDER on it.
   *
   * `CallingWidget` has exactly one exit of its own — the end-call button — and
   * it only exists once a call is up. Every way `startCall` can bail before
   * then returns silently WITHOUT firing `onCallEnd`: no socket URL, a mic
   * permission the user just denied (the first call is precisely when that
   * prompt appears), audio capture failing. With gestures disabled and no
   * header, each of those stranded the user on a screen they could only leave
   * by killing the app. This is the way out.
   */
  const [connected, setConnected] = useState(false);
  /** Set when the call ended on the crisis route — see `handleCallEnd`. */
  const [crisisEnded, setCrisisEnded] = useState(false);

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
  const [consentDeclined, setConsentDeclined] = useState(false);
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

  /**
   * WAIT FOR THE ANSWERS TO LAND BEFORE ASKING WHO IS CALLING.
   *
   * Act 1's answers live on the device until signup, and MainNavigator replays
   * them in an effect that races this screen's mount. Ask too early and the
   * server has no signals to match on, so it falls back to the default caller
   * — and the pre-signup screen has already promised a name. Being handed
   * Sofia after being told Omar would ring is the one way this screen can
   * quietly break its own promise.
   *
   * `hasPendingReplay()` goes false either when the replay succeeds or when
   * there was nothing to replay, so the gate opens on both. The ceiling exists
   * because a FAILED replay leaves it pending forever: after that we ask
   * anyway and take the default, which is a worse call than we meant to give
   * but far better than a spinner that never resolves.
   */
  const [replayed, setReplayed] = useState(
    () => !standalone || !useOnboardingDraftStore.getState().hasPendingReplay(),
  );
  useEffect(() => {
    if (replayed) return;
    // `hasPendingReplay` reads the live store rather than the emitted state,
    // so it is called off getState() — the subscription is only the trigger.
    // It flips false the moment `markReplayed` runs, which is immediately
    // after the server acknowledges the answers: exactly the right moment.
    const unsub = useOnboardingDraftStore.subscribe(() => {
      if (!useOnboardingDraftStore.getState().hasPendingReplay()) {
        setReplayed(true);
      }
    });
    const ceiling = setTimeout(() => setReplayed(true), REPLAY_WAIT_MS);
    return () => {
      unsub();
      clearTimeout(ceiling);
    };
  }, [replayed]);

  useEffect(() => {
    if (seeded?.scenario || !replayed) return;
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
  }, [seeded, replayed]);

  /**
   * Nothing to offer, and nobody to tell. On Home this renders an explanation
   * with a way back; here there is no "back" and no context in which the
   * message would mean anything — they signed up seconds ago. So it hands
   * straight on to onboarding, and the offer (which the server still holds) is
   * made again from Home in the ordinary way.
   */
  useEffect(() => {
    if (standalone && phase === "gone") onFinished?.();
  }, [standalone, phase, onFinished]);

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
    if (standalone) {
      onFinished?.();
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate("Root", { screen: "HOME" });
  }, [standalone, onFinished, navigation]);

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
      setConnected(true);
      track(ANALYTICS_EVENTS.FIRST_CALL_CONNECTED, { action });
      return id;
    }
    // The widget takes null as "do not connect" and stops there, silently —
    // nothing was created server-side, so the call is still theirs. Say so,
    // instead of leaving them looking at a dead call button.
    setPhase("failed");
    return null;
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
      // A CRISIS-ENDED CALL NEVER REACHES THE CHECK-IN.
      //
      // The crisis-support modal — the one with the helpline on it — lives
      // INSIDE CallingWidget, and advancing the phase unmounts the widget.
      // Doing that here would take a distressed person's helpline off the
      // screen and replace it with "You took the call. How do you feel?
      // — Honestly, good". The widget already goes to great lengths to keep
      // that modal reachable; this is the same promise kept from the outside.
      //
      // So the widget stays mounted and owns the screen. All we add is a way
      // out for afterwards, once its own modals are dismissed.
      if (reason === "crisis") {
        setCrisisEnded(true);
      } else {
        setPhase("aftercare");
      }
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
              : offer?.reason === "not_eligible"
                ? // Unreachable in practice: the Home card renders nothing for
                  // these accounts, so nobody navigates here. Worded anyway,
                  // because a dead end that says "error" to somebody who did
                  // nothing wrong is worse than one extra string.
                  "This one's a welcome for new accounts. Your calls live in your practice, ready when you are."
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
          {/* Shown only until the call is up: after that the widget's own
              end-call button is the exit, and a second way out that skipped
              hanging up properly would leak a live call. It comes back after a
              crisis-ended call, where we deliberately do NOT advance the phase
              and so would otherwise strand them behind the widget. */}
          {(!connected || crisisEnded) && (
            <View style={styles.escape}>
              <IconButton
                name="arrow-left"
                accessibilityLabel="Leave without taking the call"
                onPress={leave}
              />
            </View>
          )}
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
            if (standalone) {
              // Pushed, not replaced: Breathing's no-params exit is goBack(),
              // which needs something to go back TO. It lands here, on the
              // check-in, and one tap finishes the flow.
              navigation.navigate("Breathing", { from: "FIRST_CALL" });
            } else {
              navigation.replace("ExploreStack", {
                screen: "Breathing",
                params: { from: "HOME" },
              });
            }
          }}
          onFinish={(feeling: AfterCallFeeling | null) => {
            track(ANALYTICS_EVENTS.FIRST_CALL_FEELING, { feeling });
            leave();
          }}
        />
      )}

      <AICallConsentModal
        visible={needsConsent && phase === "gate" && !consentDeclined}
        onAcknowledge={() => {
          markAICallConsented();
          postAiCallConsent().catch(() => {});
        }}
        // Close first, leave from onDismissed: this is a native Modal, and
        // navigating while it is presented strands it over the next screen.
        onDecline={() => setConsentDeclined(true)}
        onDismissed={() => {
          if (consentDeclined) leave();
        }}
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
  escape: {
    position: "absolute",
    top: spacing.sm,
    left: space.screenX,
    zIndex: 10,
  },
}));
