import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

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
  fonts,
  withAlpha,
  Gradient,
  zIndex,
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
import { TAG_LABELS, proposedTags } from "../../constants/discoveryTags";
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
  // Measured, so the scroll body reserves the bar's REAL height and the last
  // card can be scrolled clear of it. Same approach as `Page`'s footer.
  const [barH, setBarH] = useState(0);
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
  /**
   * Commit the sheet: whether you are listed, and what the card says.
   *
   * ONE WRITE FOR BOTH, because they are one decision. The sheet holds the
   * switch and the tags together and Done sends them together, the same shape
   * the Settings screen uses. Splitting them would let the two halves disagree
   * for a round trip.
   */
  const saveCard = async (nextListed: boolean, tags: string[]) => {
    if (listing) return;
    const wasListed = profile?.discoverable ?? false;
    setDraftTags(tags);
    setPickingTags(false);

    // NOTHING TO PUBLISH AND NOTHING TO STOP. Not listed before, not after: the
    // tags are a proposal, and writing them would persist a card the person has
    // not agreed to show. "List me" on the bar is that write.
    if (!wasListed && !nextListed) return;

    setListing(true);
    try {
      setProfile(await setDiscoveryProfile(nextListed, tags));
      markOffered();
    } catch (e) {
      // Put the card back to what the server still has, rather than leaving the
      // screen claiming a change that did not land.
      if (profile) setDraftTags(profile.tags);
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
   * YOUR STATUS, PINNED, WHILE THE LIST OWNS THE SCREEN.
   *
   * This was a 300pt card at the top of a page whose entire job is showing you
   * other people. Measured on a 812pt phone: the list began 466pt down, so with
   * candidates you saw no complete card, and with none the "Bring someone you
   * know" prompt and its invite code landed below the fold entirely. Nobody
   * ever saw the thing the screen exists for without scrolling first.
   *
   * The card is a bar now, and the bar is the card: avatar, name, and the tags
   * a stranger would read, in a row. Nothing is lost — those three things ARE
   * the card — and the whole scroll goes to the list. It can afford a permanent
   * object at the bottom because this is a pushed route, so `CustomTabBar` is
   * already hidden here (`getTabBarVisibility`).
   *
   * The row body opens the picker; the trailing button is the primary action
   * for the state. Both lead somewhere for the two listed states, which is
   * deliberate — a bigger target for the same intent.
   */
  const renderStatusBar = () => {
    // No bar for a hard blocker: there is no status to pin when the answer is
    // "not yet", and the reason needs a sentence the card above gives it.
    // A PAUSE still gets a bar, because the switch is real and turning it off
    // is still something you may want to do.
    if (!profile || profile.blockedReason) return null;

    const listed = profile.discoverable;

    /**
     * WRITTEN TO FIT, NOT TRUNCATED TO FIT.
     *
     * After the avatar, the title and the button there are roughly 24
     * characters left on this line. "Just your name and your avatar" became
     * "Just your name and your av…", which is thirty characters spent saying
     * nothing — an ellipsis is the layout admitting it had no room for the
     * sentence, and the reader gets the admission rather than the fact.
     *
     * So the line is built short instead. One tag and a count always fits, at
     * every tag count, in every state. The full list is one tap away in the
     * picker, and it is read out in full to a screen reader below, where there
     * is no width to run out of.
     */
    const first = draftTags.length ? TAG_LABELS[draftTags[0]] ?? draftTags[0] : null;
    const says = first
      ? draftTags.length > 1
        ? `${first} +${draftTags.length - 1}`
        : first
      : "No tags yet";
    const saysFull = draftTags.length
      ? draftTags.map((t) => TAG_LABELS[t] ?? t).join(", ")
      : "just your name and your avatar";

    return (
      <View
        style={[styles.barWrap, { paddingBottom: Math.max(insets.bottom, space.rowGap) }]}
        pointerEvents="box-none"
      >
        {/* The list dissolves into the canvas rather than being cut by an
            opaque band, same as `Page`'s footer and the recorder dock.
            Canvas-relative, so the `scrimDown` token is the right one here. */}
        <View pointerEvents="none" style={styles.barFade}>
          <Gradient token="scrimDown" style={StyleSheet.absoluteFill} />
        </View>

        <PressableScale
          scaleTo={0.995}
          onPress={() => setPickingTags(true)}
          onLayout={(e) => setBarH(e.nativeEvent.layout.height)}
          accessibilityRole="button"
          accessibilityLabel={
            listed
              ? `Your card says ${saysFull}. Change it.`
              : `You are not listed. Your card would say ${saysFull}.`
          }
          style={[
            styles.bar,
            {
              backgroundColor: colors.surface.elevated,
              borderColor: withAlpha(colors.action.primary, 0.3),
            },
          ]}
        >
          <UserAvatar manifest={user?.avatarManifest} size={34} shape="square" />
          <View style={styles.barText}>
            {/* Never "You're listed" while something is hiding them. The card
                above carries the reason; this just stops asserting the
                opposite of it. */}
            <Text variant="bodySm" numberOfLines={1} style={styles.barTitle}>
              {!listed
                ? "You're not listed"
                : profile.pausedReason
                  ? "Listed, but hidden"
                  : "You're listed"}
            </Text>
            {/* What a stranger reads, or what they would. The bar is a preview,
                not a status light, so it carries the words rather than a
                summary of them. */}
            <Text variant="caption" color="tertiary" numberOfLines={1}>
              {says}
            </Text>
          </View>
          {/* THE VERB FOLLOWS THE STATE. "Change" was hard-coded for both
              listed cases, so a card with nothing on it offered to change
              nothing. Adding your first tag and editing three are different
              acts and get different words.

              Listing publishes exactly the card shown one line to the left, so
              nothing is ever published unseen — the rule the full card existed
              to hold, kept in a third of the space. */}
          <Button
            label={
              listing
                ? "Saving…"
                : !listed
                  ? "List me"
                  : draftTags.length
                    ? "Change"
                    : "Add tags"
            }
            variant={listed ? "secondary" : "primary"}
            size="sm"
            fullWidth={false}
            disabled={listing}
            onPress={() => (listed ? setPickingTags(true) : setListed(true))}
          />
        </PressableScale>
      </View>
    );
  };

  /**
   * The one thing that still belongs INSIDE the scroll: an account that cannot
   * be listed at all. It needs a sentence of explanation, which is more than a
   * bar can hold, and there is no status to pin when the answer is "not yet".
   */
  const renderBlocked = () => {
    if (!profile) return null;

    /**
     * TWO KINDS OF "YOU ARE NOT APPEARING", ONE CARD.
     *
     * `blockedReason` is hard: the server refuses the write, so there is no
     * switch to offer and nothing to pin at the bottom. `pausedReason` is soft:
     * the switch is on, the preference is real, and something else is hiding
     * you — holiday mode, or already having a buddy. Both used to be silent in
     * the second case, so the app said "You're listed" while the query dropped
     * the person.
     *
     * Same card either way, because the reader's question is the same one.
     * Only the title differs, and only because "can't be listed yet" would be
     * wrong for someone who is listed and merely paused.
     */
    const reason = profile.blockedReason ?? profile.pausedReason;
    if (!reason) return null;

    return (
      <Surface level="default" padded bordered rounded="card" style={styles.blockedCard}>
        <View style={styles.blockedHead}>
          <Icon name={icons.warning} size={size.iconInline} color={colors.feedback.warningText} />
          <Text variant="title">
            {profile.blockedReason ? "You can't be listed yet" : "You're not showing up"}
          </Text>
        </View>
        <Text variant="bodySm" color="secondary">{reason}</Text>
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
              // Clears the pinned status bar. Without the reserve the last card
              // sits under it and the "Share your code" button is unreachable,
              // which is the bug that started this.
              paddingBottom: space.sectionGap + insets.bottom + barH,
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
          {renderBlocked()}
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
        listed={profile?.discoverable ?? false}
        blockedReason={profile?.blockedReason}
        saving={listing}
        onClose={() => setPickingTags(false)}
        onSave={saveCard}
      />

      {renderStatusBar()}

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
  // A warning stripe rather than the accent rim: this card is not an offer and
  // must not read like one.
  blockedCard: { gap: space.rowGap },
  blockedHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  // ── The pinned status bar ────────────────────────────────────────────────
  barWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.screenX,
    zIndex: zIndex.sticky,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    padding: space.rowGap,
    borderRadius: radius.card,
    borderWidth: borderWidth.hairline,
  },
  barText: { flex: 1, minWidth: 0, gap: space.titleSub },
  barTitle: { fontFamily: fonts.bold },
  barFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    // Starts well above the bar so the list dissolves rather than being cut.
    top: -space.sectionGap * 2,
  },
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
