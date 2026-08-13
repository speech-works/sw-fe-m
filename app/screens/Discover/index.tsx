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
  Toggle,
  Icon,
  IconButton,
  SchemeStatusBar,
  icons,
  borderWidth,
  withAlpha,
} from "../../design-system";
import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import { UserAvatar } from "../../components/UserAvatar";
import { useUserStore } from "../../stores/user";
import ReportSheet from "../../components/ReportSheet";
import {
  discoverBuddies,
  getMyBuddy,
  sendBuddyRequest,
  getDiscoveryProfile,
  setDiscoveryProfile,
  type DiscoveryCandidate,
  type DiscoveryProfile,
} from "../../api/buddies";
import {
  useDiscoveryPromptStore,
  shouldOfferDiscovery,
} from "../../stores/discoveryPrompt";
import { blockUser, reportContent, type ReportReason } from "../../api/moderation";
import { apiErrorMessage } from "../../util/functions/apiError";
import {
  showErrorBottomSheet,
  showSuccessBottomSheet,
} from "../../util/functions/bottomSheet";
import { shareBuddyInvite } from "../../util/functions/share";
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
  const offeredAt = useDiscoveryPromptStore((s) => s.offeredAt);
  const markOffered = useDiscoveryPromptStore((s) => s.markOffered);
  const [asking, setAsking] = useState<string | null>(null);
  const [pendingBlock, setPendingBlock] = useState<DiscoveryCandidate | null>(null);
  const [reporting, setReporting] = useState<DiscoveryCandidate | null>(null);
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
      setProfile(await setDiscoveryProfile(next, profile?.tags ?? []));
      markOffered();
    } catch (e) {
      showErrorBottomSheet("Couldn't save", apiErrorMessage(e, "Please try again."));
    } finally {
      setListing(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

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
  const renderConsent = () => {
    if (!profile || profile.discoverable) return null;

    // Nothing to offer while the account cannot be listed at all (today: no
    // display name of their own). Say why, and point at the fix.
    if (profile.blockedReason) {
      return (
        <Surface level="default" padded bordered rounded="card" style={styles.consent}>
          <Text variant="title">You can&apos;t be listed yet</Text>
          <Text variant="bodySm" color="secondary">{profile.blockedReason}</Text>
        </Surface>
      );
    }

    if (shouldOfferDiscovery(profile.discoverable, offeredAt)) {
      return (
        /**
         * SHOW, DON'T RECITE.
         *
         * This was five lines of grey prose in a heavy tinted box — the first
         * thing on the screen, and a wall you had to read past to get to the
         * people you came for. Every fact in it survives, but the central one
         * ("they'd see your first name and your avatar") is now the user's OWN
         * card rendered exactly as a stranger would see it. A preview answers
         * the question the prose was trying to answer, and answers it faster.
         *
         * The heavy accent fill is gone with it: a hairline rim carries "this
         * is an offer" without the card shouting over the list.
         */
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

          <View style={[styles.preview, { backgroundColor: colors.background.sunken }]}>
            <View style={styles.previewAvatar}>
              <UserAvatar manifest={user?.avatarManifest} size={44} shape="square" />
            </View>
            <View style={styles.previewText}>
              <Text variant="title" numberOfLines={1}>
                {user?.name?.split(" ")[0] || "You"}
              </Text>
              <Text variant="caption" color="tertiary">What they&apos;d see</Text>
            </View>
          </View>

          <Text variant="bodySm" color="secondary">
            Plus anything you choose to add. Turn it off whenever you like.
          </Text>
          <View style={styles.consentActions}>
            <Button
              label={listing ? "Saving…" : "Yes, list me"}
              size="sm"
              fullWidth={false}
              disabled={listing}
              onPress={() => setListed(true)}
            />
            {/* A DECLINE IS NOT A PEER OF AN ACCEPT. As a ghost `Button` this
                rendered in accent at the same size as "Yes, list me", so the
                two choices carried equal weight and the accent — the page's one
                emphasis colour — was spent on the option we are not asking for.
                A muted touchable keeps it entirely available and stops it
                competing. Records only that we asked; browsing is untouched and
                the quiet row below keeps the door open without a second ask. */}
            <TouchableOpacity
              onPress={markOffered}
              disabled={listing}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
            >
              <Text variant="bodySm" color="tertiary">Not now</Text>
            </TouchableOpacity>
          </View>
        </Surface>
      );
    }

    return (
      <Surface level="default" padded bordered rounded="card" style={styles.quietRow}>
        <View style={styles.quietText}>
          <Text variant="bodySm">You&apos;re not listed</Text>
          <Text variant="bodySm" color="secondary">Others can&apos;t find you here.</Text>
        </View>
        <Toggle value={false} onChange={() => setListed(true)} />
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
  preview: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.iconText,
    padding: spacing.sm,
    borderRadius: radius.card,
  },
  previewAvatar: { borderRadius: radius.sm, overflow: "hidden" },
  previewText: { flex: 1, gap: 2 },
  consentActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  quietRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  quietText: { flex: 1, gap: 2 },
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
