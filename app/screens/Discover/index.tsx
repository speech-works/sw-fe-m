import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import {
  useTheme,
  spacing,
  space,
  radius,
  size,
  Surface,
  Text,
  Chip,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Spinner,
  Icon,
  IconButton,
  SchemeStatusBar,
  icons,
  borderWidth,
  duration,
  fonts,
  withAlpha,
} from "../../design-system";
import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import PressableScale from "../../components/PressableScale";
import { UserAvatar } from "../../components/UserAvatar";
import { useUserStore } from "../../stores/user";
import ReportSheet from "../../components/ReportSheet";
import TagPickerSheet from "../../components/TagPickerSheet";
import {
  discoverBuddies,
  getMyBuddy,
  sendBuddyRequest,
  getDiscoveryProfile,
  setDiscoveryProfile,
  type DiscoveryCandidate,
  type DiscoveryProfile,
} from "../../api/buddies";
import { useDiscoveryPromptStore } from "../../stores/discoveryPrompt";
import { blockUser, reportContent, type ReportReason } from "../../api/moderation";
import { apiErrorMessage } from "../../util/functions/apiError";
import {
  showErrorBottomSheet,
  showSuccessBottomSheet,
} from "../../util/functions/bottomSheet";
import { shareBuddyInvite } from "../../util/functions/share";
import {
  MAX_DISCOVERY_TAGS,
  TAG_LABELS,
  proposedTags,
} from "../../constants/discoveryTags";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

/**
 * Finding a buddy when you don't already know one.
 *
 * Everyone here opted in — nobody is listed by default, because being in a
 * stuttering-support app is itself a health disclosure. Each card shows only
 * what its owner chose to say about themselves; the server never republishes
 * onboarding answers, and `matchReason` is null rather than vague when there is
 * nothing honest to claim. Render nothing in that case; do not soften it.
 *
 * Report and block are available BEFORE pairing, deliberately: this is the one
 * surface where you can be contacted by someone you have no relationship with.
 */
const Discover = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const user = useUserStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const [candidates, setCandidates] = useState<DiscoveryCandidate[] | null>(null);
  const [profile, setProfile] = useState<DiscoveryProfile | null>(null);
  const [listing, setListing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const markOffered = useDiscoveryPromptStore((s) => s.markOffered);
  const [asking, setAsking] = useState<string | null>(null);
  const [pendingBlock, setPendingBlock] = useState<DiscoveryCandidate | null>(null);
  const [reporting, setReporting] = useState<DiscoveryCandidate | null>(null);
  const [pickingTags, setPickingTags] = useState(false);
  /**
   * What the card says right now, published or not.
   *
   * Two states share this one variable on purpose. Once you are listed it
   * mirrors the server. Before that it is a PROPOSAL: their own answers,
   * rendered as the card, sent only when they press the button. Nothing derived
   * from onboarding is ever written until it has been on screen and agreed to.
   */
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const afterSheetDismissed = useRef<(() => void) | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const page = await discoverBuddies();
      setCandidates(page.candidates);
      setNextCursor(page.nextCursor);
    } catch {
      setError(true);
    }
    // Separately caught: not knowing whether you're listed must never stop the
    // list itself rendering. Browsing does not depend on being listed.
    try {
      setProfile(await getDiscoveryProfile());
    } catch {
      setProfile(null);
    }
  }, []);

  /**
   * Turn listing on or off.
   *
   * Marks the offer as made whichever way it goes — the point of the record is
   * that we asked, not what they said. Existing tags are preserved so toggling
   * off and on again doesn't quietly wipe the card they built.
   */
  const setListed = async (next: boolean) => {
    if (listing) return;
    setListing(true);
    try {
      // `draftTags`, not `profile.tags`: this is the moment the proposal on
      // screen becomes the published card, and it must be exactly what they
      // just looked at.
      setProfile(await setDiscoveryProfile(next, draftTags));
      markOffered();
    } catch (e) {
      showErrorBottomSheet("Couldn't save", apiErrorMessage(e, "Please try again."));
    } finally {
      setListing(false);
    }
  };

  /**
   * Save the card's tags without touching whether you are listed.
   *
   * `profile.discoverable` rides along unchanged, and that is the whole point:
   * this can be used from the ask, BEFORE anyone has said yes. A picker that
   * assumed `true` would list someone as a side effect of describing
   * themselves, which is the one thing this screen is careful never to do.
   */
  const saveTags = async (tags: string[]) => {
    if (listing) return;
    setDraftTags(tags);
    setPickingTags(false);

    // NOT YET LISTED: keep it local. There is nothing published to update, and
    // writing here would persist a card the person has not agreed to show.
    // "Yes, list me" is the write.
    if (!profile?.discoverable) return;

    // ALREADY LISTED: this IS the publish, so it goes now. `discoverable` rides
    // along unchanged; a picker must never be able to list somebody.
    setListing(true);
    try {
      setProfile(await setDiscoveryProfile(true, tags));
    } catch (e) {
      // Put the card back to what the server still has, rather than leaving the
      // screen claiming a change that did not land.
      setDraftTags(profile.tags);
      showErrorBottomSheet("Couldn't save", apiErrorMessage(e, "Please try again."));
    } finally {
      setListing(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  // Their card if they have one, otherwise the one we would propose. Empty
  // suggestions give an empty draft, which is the honest answer rather than a
  // guess — those people get the picker instead.
  useEffect(() => {
    if (!profile) return;
    setDraftTags(
      profile.tags.length ? profile.tags : proposedTags(profile.suggestions),
    );
  }, [profile]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await discoverBuddies(nextCursor);
      setCandidates((prev) => [...(prev ?? []), ...page.candidates]);
      setNextCursor(page.nextCursor);
    } catch {
      // Leave what's already on screen; the retry is scrolling again.
    } finally {
      setLoadingMore(false);
    }
  }, [nextCursor, loadingMore]);

  /**
   * Share the invite code from the empty state.
   *
   * Fetched on tap rather than with the page: the code is needed by exactly one
   * branch of one state, and paying a request on every visit to Discover for
   * something most people never see is the wrong trade.
   */
  const shareMyCode = async () => {
    try {
      const summary = await getMyBuddy();
      await shareBuddyInvite(summary.referralCode);
    } catch (e) {
      showErrorBottomSheet("Couldn't share", apiErrorMessage(e, "Please try again."));
    }
  };

  const ask = async (person: DiscoveryCandidate) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setAsking(person.userId);
    try {
      await sendBuddyRequest(person.userId);
      track(ANALYTICS_EVENTS.BUDDY_REQUEST_SENT, { source: "discover" });
      // Drop them from the list: the server won't show them again while a
      // request is live, so leaving the card invites a second futile tap.
      setCandidates((prev) => (prev ?? []).filter((c) => c.userId !== person.userId));
      showSuccessBottomSheet(
        "Request sent",
        `We've let ${person.name.split(" ")[0]} know. You'll hear back if they say yes.`,
      );
    } catch (e) {
      showErrorBottomSheet("Couldn't send", apiErrorMessage(e, "Please try again."));
    } finally {
      inFlight.current = false;
      setAsking(null);
    }
  };

  const confirmBlock = async () => {
    const person = pendingBlock;
    setPendingBlock(null);
    if (!person || inFlight.current) return;
    inFlight.current = true;
    try {
      await blockUser(person.userId);
      track(ANALYTICS_EVENTS.BUDDY_BLOCKED, { source: "discover" });
      setCandidates((prev) => (prev ?? []).filter((c) => c.userId !== person.userId));
    } catch (e) {
      showErrorBottomSheet("Couldn't block", apiErrorMessage(e, "Please try again."));
    } finally {
      inFlight.current = false;
    }
  };

  const submitReport = async (reason: ReportReason) => {
    const person = reporting;
    setReporting(null);
    if (!person) return;
    // Optimistic and NOT rolled back, same as the timeline's report path: if
    // the POST fails, "you don't have to look at them" is still the right
    // outcome.
    setCandidates((prev) => (prev ?? []).filter((c) => c.userId !== person.userId));
    try {
      await reportContent({
        targetType: "user",
        reportedUserId: person.userId,
        reason,
      });
      track(ANALYTICS_EVENTS.CONTENT_REPORT_SENT, { target: "user", reason });
      showSuccessBottomSheet(
        "Report sent",
        "Our team will review this. You won't see them here again.",
      );
    } catch (e) {
      showErrorBottomSheet(
        "Report didn't send",
        apiErrorMessage(e, "We've hidden them on this device. Please try again."),
      );
    }
  };

  /**
   * The consent ask, at the moment of intent.
   *
   * Two tiers, one question. The FIRST time someone gets here — they have just
   * tapped "Find a buddy", so they have said out loud that they want to find
   * someone — they get the full offer. Ever after, it collapses to a quiet row
   * with a toggle that can sit there indefinitely without asking again.
   *
   * NEITHER TIER BLOCKS ANYTHING. Browsing never requires being listed:
   * charging a disclosure for access would be exactly wrong in an app where
   * telling people you stutter is one of the hardest things it teaches. The two
   * really are separable — sending a request already reveals you to that one
   * person whatever this flag says.
   */
  /**
   * Your own card, in both states, drawn once.
   *
   * The sunken plate is identical whether you are listed or not, because it is
   * the same object: what a stranger sees. Only the frame around it changes —
   * the heading above and whether there is a button below. Two renderers for
   * this drifted within a day: a "Change" text link beside the name in one and
   * a dashed "Add tags" chip in the tags row of the other, which is one job
   * wearing two costumes in two places.
   */
  const renderMyCard = () => (
    <View style={[styles.preview, { backgroundColor: colors.background.sunken }]}>
      {/* TWO ROWS, NOT A COLUMN BESIDE THE AVATAR.
          Tags used to live in the narrow strip to the right of the face, with
          about 250pt to wrap in: two of them stacked, the preview grew to three
          lines, and a 36pt chip sat almost as tall as the 44pt avatar beside
          it. A full-width row of their own is also what a stranger sees on the
          cards below, where tags run under the header rather than next to it. */}
      <View style={styles.previewHead}>
        <View style={styles.previewAvatar}>
          <UserAvatar manifest={user?.avatarManifest} size={44} shape="square" />
        </View>
        <Text variant="title" numberOfLines={1} style={styles.previewName}>
          {user?.name?.split(" ")[0] || "You"}
        </Text>
        {/* ONE CONTROL, ONE PLACE, ONE STYLE.
            Text, not a chip. This was a dashed chip down in the tags row when
            you had none and a text link up here when you did — one job in two
            costumes, in two places, swapping as you used it. It is the text
            link in both states now, pinned to the top right of the card where
            it does not move, does not reflow with the tags, and does not
            compete with the filled button below.

            Only the word changes, because adding your first tag and changing
            three of them really are different acts. */}
        <PressableScale
          onPress={() => setPickingTags(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={
            draftTags.length ? "Change what your card says" : "Add tags to your card"
          }
        >
          <Text variant="bodySm" color="accent" style={styles.editTagsLabel}>
            {draftTags.length ? "Change" : "Add tags"}
          </Text>
        </PressableScale>
      </View>

      {/* The tags, or what the card says while it has none. Not an empty view:
          a plate holding a name and nothing else reads as unfinished, and the
          person cannot tell whether it is the preview that is bare or their
          card. */}
      {draftTags.length ? (
        <View style={styles.previewTags}>
          {draftTags.slice(0, MAX_DISCOVERY_TAGS).map((t) => (
            <Chip key={t} label={TAG_LABELS[t] ?? t} />
          ))}
        </View>
      ) : (
        <Text variant="caption" color="tertiary">
          Just your name and your avatar
        </Text>
      )}
    </View>
  );

  const renderConsent = () => {
    if (!profile) return null;

    /**
     * BLOCKED, and checked before everything else.
     *
     * `discoverable` and `blockedReason` can both be set at once — the flag
     * survives on the row while something else disqualifies the account, such
     * as onboarding completion being reset by a new flow version. Saying
     * "you're listed" in that state is the exact failure the server's own
     * comment warns about: the toggle looks right, and nobody can see you.
     */
    if (profile.blockedReason) {
      return (
        <Surface level="default" padded bordered rounded="card" style={styles.consent}>
          <Text variant="title">You can&apos;t be listed yet</Text>
          <Text variant="bodySm" color="secondary">{profile.blockedReason}</Text>
        </Surface>
      );
    }

    /**
     * LISTED. The same card, minus the question.
     *
     * It used to disappear the moment you had any tags, on the theory that
     * there was nothing left to say. There is: this is the only place you can
     * see what strangers see, and the only route to changing it. A card you can
     * never look at again is not much of a card.
     */
    if (profile.discoverable) {
      return (
        // A fade, because this replaces the card that stood here a moment ago
        // and a straight swap reads as a glitch rather than as an answer. Enter
        // only: the one it replaces is already gone.
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(duration.base)}>
          <Surface level="default" padded bordered rounded="card" style={styles.consent}>
            <Text variant="title">You&apos;re listed</Text>
            {renderMyCard()}
            <Text variant="bodySm" color="secondary">
              This is exactly what someone browsing sees.
            </Text>
          </Surface>
        </Animated.View>
      );
    }

    /**
     * NOT LISTED: the card, every time.
     *
     * This used to collapse after the first visit into a one-line row with a
     * toggle, on the theory that a big card asking the same question forever is
     * a nag. It is not a question any more. It is your card, showing what it
     * would say, with the one control that edits it — and the collapsed row it
     * replaced had a toggle that published you on the spot, so the only route
     * anyone had past their first visit was the one that never showed the card.
     *
     * "Not now" went with the collapse: it existed to dismiss this, and there
     * is nothing to dismiss. Leaving it alone is not now. `offeredAt` survives
     * as the record of having asked and no longer decides what renders.
     *
     * SHOW, DON'T RECITE. The five lines of grey prose this began as are all
     * still here, answered by the card instead of described by it.
     */
    return (
      <Surface
        level="elevated"
        padded
        rounded="card"
        style={[
          styles.consent,
          { borderColor: withAlpha(colors.action.primary, 0.3), borderWidth: borderWidth.hairline },
        ]}
      >
        <View style={styles.consentHead}>
          <Text variant="title">Let others find you</Text>
          <Text variant="bodySm" color="secondary">
            Right now you can see them. They can&apos;t see you.
          </Text>
        </View>

        {renderMyCard()}

        {/* A PROPOSED card has to say it is proposed. Showing someone their own
            onboarding answers without a word about where they came from is the
            difference between a helpful default and a surprise. */}
        <Text variant="bodySm" color="secondary">
          {draftTags.length && !profile.tags.length
            ? "Taken from your answers. Nothing is shared until you press the button."
            : "Turn it off whenever you like."}
        </Text>

        <Button
          label={listing ? "Saving…" : "Yes, list me"}
          size="sm"
          fullWidth={false}
          disabled={listing}
          onPress={() => setListed(true)}
          style={styles.listMe}
        />
      </Surface>
    );
  };

  /**
   * One person.
   *
   * THE FACE IS THE CONTENT, so it is 64pt and SQUARE — the same tile the
   * Community room is built from. That shape is the whole visual bond between
   * the two screens: over there the room is dimmed illustration with one lit
   * tile (you), and here every tile is lit, because here they are real.
   *
   * REPORT IS NOT A PEER OF "ASK TO PAIR". It used to be a ghost Button beside
   * it, the same size and the same row, which made every stranger look like a
   * suspect and put a moderation action one mis-tap from the primary one. It is
   * now the app's existing card-header affordance — a plain touchable with a
   * 16pt glyph and hitSlop out to 44 (see SignalCard, which does exactly this
   * and explains why an IconButton is too heavy for a card header).
   */
  const renderCard = (person: DiscoveryCandidate) => (
    <Surface
      key={person.userId}
      level="elevated"
      padded
      rounded="card"
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <UserAvatar manifest={person.avatarManifest} size={64} shape="square" />
        </View>
        <View style={styles.cardText}>
          <Text variant="h3" numberOfLines={1}>
            {person.name.split(" ")[0]}
          </Text>
          {/* Null means we have nothing honest to say — show nothing at all
              rather than a softer line. */}
          {person.matchReason ? (
            <Text variant="bodySm" color="secondary">{person.matchReason}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => setReporting(person)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={`Report ${person.name.split(" ")[0]}`}
          style={styles.reportAction}
        >
          <Icon name={icons.report} size={size.iconSm} color={colors.text.tertiary} />
        </TouchableOpacity>
      </View>

      {person.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {person.tags.slice(0, 2).map((t) => (
            <Chip key={t} label={t} />
          ))}
        </View>
      ) : null}

      {/* Full width, and the only filled thing on the card. One card, one verb. */}
      <Button
        label={asking === person.userId ? "Sending…" : "Ask to pair"}
        disabled={asking !== null}
        onPress={() => ask(person)}
      />
    </Surface>
  );

  const body = () => {
    if (candidates === null && !error) return <Spinner label="Looking…" />;
    if (error && !candidates?.length) {
      return (
        <ErrorState
          title="Couldn't load"
          message="Check your connection and try again."
          onRetry={load}
        />
      );
    }
    if (!candidates?.length) {
      /**
       * A common answer, not a failure, and the copy has to say so honestly.
       *
       * This used to read "Not many people are open to new buddies right now",
       * which is a claim about other people's WILLINGNESS that we cannot make
       * and do not know. The list is short because being findable is opt-in and
       * new; nobody has turned this user down. In an app about a stutter, "not
       * many people want a buddy" is one short step from "not many people want
       * you", and that is not a sentence to put in front of someone who just
       * asked to meet somebody.
       *
       * So it leads with the action instead of the absence. The code is the
       * path that actually works today, and it is now a button rather than the
       * tail of a sentence you could not act on without backing out of the
       * screen. The icon changed too: two people was a picture of exactly the
       * thing that is missing.
       */
      return (
        <EmptyState
          icon={icons.addPerson}
          title="Bring someone you know"
          message="Being findable is new here, and it's opt-in, so this list is still small. Your invite code works right now."
          actionLabel="Share your code"
          onAction={shareMyCode}
        />
      );
    }
    return (
      <View style={styles.list}>
        {candidates.map(renderCard)}
        {loadingMore ? <Spinner /> : null}
      </View>
    );
  };

  return (
    /**
     * NOT `Page`. Page owns its own header slot and renders it OUTSIDE the
     * scroll container whenever the body is a custom scroller — and this screen
     * needs a custom scroller for `onEndReached`. Anything handed to Page here
     * is therefore pinned, back arrow included, which is not how the rest of
     * the app behaves: `PageHeader` puts the back bar inside the scroll body so
     * the whole header travels with the content.
     *
     * So the scaffold is hand-rolled — canvas, status bar, status cap and the
     * top inset are four lines — and EVERYTHING lives in one scroller.
     */
    <ScreenView>
      <SchemeStatusBar />
      <CustomScrollView onEndReached={loadMore}>
        {/* No dock clearance here: this is a PUSHED screen, so `CustomTabBar` is
            hidden (`getTabBarVisibility`) and the 120pt this used to reserve was
            120pt of dead space. What the bottom actually needs is breathing room
            plus the safe area. */}
        <View
          style={[
            styles.scrollBody,
            {
              paddingTop: insets.top + space.inlineGap,
              paddingBottom: space.sectionGap + insets.bottom,
            },
          ]}
        >
          {/* The canonical back bar, matching PageHeader's geometry exactly
              (`size.backBtn` tall, DS `IconButton`) so this screen's header sits
              at the same height as every other screen's. */}
          <View style={styles.backBar}>
            <IconButton name="arrow-left" onPress={() => navigation.goBack()} />
          </View>

          {/**
           * A poster header, not a page title — this screen is the second half
           * of the Community room and reads in the same register: a kicker, a
           * display line, and one quiet line of reassurance.
           *
           * The headline echoes the room's ("There's a space next to you").
           * Your seat is empty; so are theirs. It is also literally true — the
           * candidate query excludes anyone who already has an active link.
           *
           * WHAT IS NOT HERE: the illustrated crowd. Bonding the screens by
           * reusing that art would put generated faces directly above a list of
           * real people and invite the reading that both are real. The bond is
           * type, colour and tile shape instead.
           */}
          {/* NO EYEBROW. The Community room earns a kicker because it has no
              other title and the tab label is a 12px word beside an icon. Here
              it repeated itself three times over: you arrived by tapping "Find
              someone" from Community, the back arrow already establishes the
              hierarchy, and the headline says what the page is. A label whose
              only job is to name where you came from is chrome. */}
          <View style={styles.titleBlock}>
            <Text variant="poster" style={styles.headline}>
              People with a space{" "}
              <Text variant="poster" style={[styles.headline, { color: colors.text.accent }]}>
                next to them.
              </Text>
            </Text>
            <Text variant="bodySm" color="secondary">
              Everyone here chose to be findable.
            </Text>
          </View>

          {/* Above the list, and outside `body()`, so it still shows when the
              list is empty or failed — "nobody to show" is exactly when being
              findable yourself matters most. */}
          {renderConsent()}
          {body()}
        </View>
      </CustomScrollView>

      {/* Opaque cap so scrolled content passes BEHIND the system clock rather
          than through it — the one thing `Page` was still providing. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: insets.top,
          backgroundColor: colors.background.canvas,
        }}
      />

      {/* The same picker Settings uses, opened from wherever the gap is
          visible. Never at the same time as another sheet: both entry points
          are plain rows, not sheet actions. */}
      <TagPickerSheet
        visible={pickingTags}
        value={draftTags}
        saving={listing}
        onClose={() => setPickingTags(false)}
        onSave={saveTags}
      />

      <ReportSheet
        visible={reporting !== null}
        onClose={() => setReporting(null)}
        target="user"
        personName={reporting?.name.split(" ")[0]}
        onSubmit={submitReport}
        // Blocking from here needs its own confirm, and a confirm is a second
        // native modal — so it waits for this sheet to be fully gone.
        onBlock={() => {
          const person = reporting;
          setReporting(null);
          if (person) afterSheetDismissed.current = () => setPendingBlock(person);
        }}
        blockLabel={`Block ${reporting?.name.split(" ")[0] ?? "them"}`}
        onDismissed={() => {
          const run = afterSheetDismissed.current;
          afterSheetDismissed.current = null;
          run?.();
        }}
      />

      <Dialog
        exclusive
        visible={pendingBlock !== null}
        onClose={() => setPendingBlock(null)}
        title={`Block ${pendingBlock?.name.split(" ")[0] ?? "them"}?`}
        message="They won't be able to find you or send you a request."
        cancelLabel="Cancel"
        confirmLabel="Block"
        destructive
        onConfirm={confirmBlock}
      />
    </ScreenView>
  );
};

export default Discover;

const styles = StyleSheet.create({
  // ── Poster header ─────────────────────────────────────────────────────────
  // Matches PageHeader's back bar so the header lands at the same height as
  // every other screen's.
  backBar: { minHeight: size.backBtn, flexDirection: "row", alignItems: "center" },
  titleBlock: { marginTop: space.titleGap },
  // The cut itself now lives in `typography.poster`, shared with the room's
  // stage — this screen has to answer the room in the same voice, and two
  // hand-rolled copies of "the same voice" were 4px and 0.2 of tracking apart.
  headline: { marginBottom: spacing.xxs },

  scrollBody: {
    paddingHorizontal: space.screenX,
    gap: space.groupGap,
  },
  consent: { gap: spacing.md },
  consentHead: { gap: spacing.xxs },
  // An inset well, not another card: this is a sample of something, and a
  // sunken surface is how the app already says "contained sample".
  // A column of two rows now. `spacing.sm` of padding was tuned when this held
  // one line of caption text; with 36pt chips inside it, the plate was gripping
  // its contents. `cardPad` is what every other container in the app uses when
  // it holds real controls.
  preview: {
    padding: space.cardPad,
    borderRadius: radius.card,
    gap: space.rowGap,
  },
  previewHead: { flexDirection: "row", alignItems: "center", gap: space.iconText },
  previewAvatar: { borderRadius: radius.sm, overflow: "hidden" },
  // `flex: 1` so a long first name truncates instead of pushing the row wide.
  previewName: { flex: 1, minWidth: 0 },
  // `spacing.sm`, matching the picker's own chip grid: the same objects, laid
  // out the same way, in both places you meet them.
  previewTags: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  editTagsLabel: { fontFamily: fonts.bold },
  // One button, left-aligned with everything else in the card. `alignSelf`
  // rather than a row wrapper, now that it has nothing to sit beside.
  listMe: { alignSelf: "flex-start" },
  list: { gap: space.groupGap },
  card: { gap: spacing.md },
  // `flex-start`, not `center`: the report glyph belongs at the top of the card,
  // and centring the row would float it against the middle of a 64pt tile.
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: space.iconText },
  // No ring and no circle. The square tile IS the bond with the Community room;
  // a circular avatar in a hairline ring is the generic list-row idiom this
  // screen was trying to stop looking like.
  avatar: { borderRadius: radius.card, overflow: "hidden" },
  cardText: { flex: 1, gap: 2, paddingTop: spacing.xs },
  reportAction: { paddingTop: spacing.xxs },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
