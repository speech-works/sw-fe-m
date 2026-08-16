import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  useTheme,
  spacing,
  space,
  radius,
  size,
  Text,
  Dialog,
  ErrorState,
  Spinner,
  Icon,
  IconButton,
  SchemeStatusBar,
  icons,
  borderWidth,
} from "../../design-system";
import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";

/** A `ScreenView`-shaped box with none of its screen behaviour, for the
 *  embedded case where the host is already the screen. */
const PlainFrame: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <View style={{ flex: 1 }}>{children}</View>
);
import PressableScale from "../../components/PressableScale";
import { UserAvatar } from "../../components/UserAvatar";
import { useUserStore } from "../../stores/user";
import ReportSheet from "../../components/ReportSheet";
import TagPickerSheet from "../../components/TagPickerSheet";
import CandidateSheet from "./CandidateSheet";
import {
  discoverBuddies,
  sendBuddyRequest,
  cancelBuddyRequest,
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
import { openOnboarding } from "../../util/functions/openOnboarding";
import { listingFix, listingFixLabel } from "../../util/functions/listingBlock";
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
/**
 * Props exist only for the EMBEDDED case.
 *
 * This was a pushed route. It is now the Discover half of the People page,
 * rendered by Community — because a dock can only morph on a screen that has
 * one, and `getTabBarVisibility` hides the dock on every pushed screen. The
 * host supplies the chrome (one back bar, one title, the Waiting/Discover
 * switcher) and receives the scroll offset so it can hand that switcher to the
 * dock at the right moment.
 */
export interface DiscoverProps {
  /** Rendered inside the People page rather than as its own screen. */
  embedded?: boolean;
  /** A spacer the height of the host's fixed header, drawn at the top of THIS
   *  scroll view so the first row starts below it. The header itself is the
   *  host's, and sits above the pager so a swipe does not move it. */
  header?: React.ReactNode;
  /** Scroll offset, for the host's dock cue. */
  onScrollY?: (y: number) => void;
}

const Discover: React.FC<DiscoverProps> = ({ embedded = false, header, onScrollY }) => {
  // `ScreenView` standalone, a plain flex box when the host already provides one.
  const Frame = embedded ? PlainFrame : ScreenView;
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const user = useUserStore((s) => s.user);

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
  /** The person whose sheet is open. The row's only job is to set this. */
  const [openCandidate, setOpenCandidate] = useState<DiscoveryCandidate | null>(null);
  const [pickingTags, setPickingTags] = useState(false);
  // Measured, so the scroll body reserves the bar's REAL height and the last
  // card can be scrolled clear of it. Same approach as `Page`'s footer.
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
   * Change one person in the list, leaving the rest and their order alone.
   *
   * Asking and withdrawing both do this rather than refetching. The server
   * sorts asked people to the bottom, and having the card you just pressed
   * jump down the screen under your thumb is worse than a list that is briefly
   * out of the server's preferred order. It sorts itself on the next load.
   */
  const patch = (userId: string, change: Partial<DiscoveryCandidate>) =>
    setCandidates((prev) =>
      (prev ?? []).map((c) => (c.userId === userId ? { ...c, ...change } : c)),
    );

  const ask = async (person: DiscoveryCandidate) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setAsking(person.userId);
    try {
      const req = await sendBuddyRequest(person.userId);
      track(ANALYTICS_EVENTS.BUDDY_REQUEST_SENT, { source: "discover" });
      /**
       * They STAY, holding the request.
       *
       * This used to drop them from the list, reasoning that the server would
       * not return them again so a second tap would be futile. The second tap
       * was never the problem: deleting the card meant asking somebody made
       * them disappear, the list silently shortened, and a toast was the only
       * evidence it had happened. Nothing was left to wait on or to change your
       * mind about. The server keeps sending them now, and the id it hands back
       * is what turns the card into its asked state without a refetch.
       */
      patch(person.userId, { requestId: req.id, requestedAt: req.createdAt });
    } catch (e) {
      showErrorBottomSheet("Couldn't send", apiErrorMessage(e, "Please try again."));
    } finally {
      inFlight.current = false;
      setAsking(null);
    }
  };

  /**
   * Take back a request you sent.
   *
   * Deleted rather than declined, server-side: you changed your mind, which
   * should not bar you from ever asking again. So the card goes straight back
   * to offering the button.
   */
  const withdraw = async (person: DiscoveryCandidate) => {
    const id = person.requestId;
    if (!id || inFlight.current) return;
    inFlight.current = true;
    setAsking(person.userId);
    try {
      await cancelBuddyRequest(id);
      patch(person.userId, { requestId: undefined, requestedAt: undefined });
    } catch (e) {
      showErrorBottomSheet("Couldn't cancel", apiErrorMessage(e, "Please try again."));
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
    if (!profile) return null;

    /**
     * ONE BAR, EVERY STATE.
     *
     * Blocked used to render as a card at the top of the scroll while every
     * other listing state rendered as this bar. Same subject, same single
     * action, two different objects in two different places — and the card ate
     * the top of a list the whole screen exists to show.
     *
     * The reason it was a card was that a blocked message is a sentence and the
     * bar's subtitle was written to fit one short line. That is a two-line
     * allowance, not a second component.
     */
    const blocked = profile.blockedReason;
    const fix = listingFix(blocked);
    const listed = profile.discoverable;

    /**
     * WRITTEN TO FIT, NOT TRUNCATED TO FIT.
     *
     * After the avatar, the title and the button there are roughly 24
     * characters per line. "Just your name and your avatar" became "Just your
     * name and your av…", which is thirty characters spent saying nothing.
     *
     * So the normal states are built short. One tag and a count always fits, at
     * every tag count. The blocked reason is the server's own sentence and gets
     * the second line to say it in.
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

    /**
     * ONE SUMMARY LINE, THE SAME SHAPE THE ROWS BELOW USE.
     *
     * Every person on this page is a name over one line of what they are
     * about. You are a person on this page, so you get a name over one line of
     * what you are about. The state leads, because that is the fact you came
     * for; what follows qualifies it, which is your tags normally and the
     * server's own sentence when something is wrong.
     */
    const state = blocked
      ? "Not listed yet"
      : !listed
        ? "Not listed"
        : profile.pausedReason
          ? "Hidden"
          : "Listed";

    const detail =
      blocked ??
      profile.pausedReason ??
      (draftTags.length ? says : listed ? "No tags yet" : "Nobody can find you");

    // Two lines allowed, and the short states never reach the second. Blocked
    // and paused reasons are the server's sentences, which is what the second
    // line is for.
    const sub = `${state}  ·  ${detail}`;

    // Blocked and paused both carry a warning tone. The difference between them
    // is what happens on tap, not the colour: one is fixable from here, the
    // other is a state you undo where you set it.
    const warn = !!(blocked || profile.pausedReason);

    /**
     * A WORD ONLY WHEN IT IS ASKING FOR SOMETHING.
     *
     * The chevron already says "there is more here", so on the settled state
     * the old "Change" was the chevron said twice. What is left is the cases
     * where there is something to gain by tapping: get listed, finish your
     * card, clear a block. Those are worth a word.
     */
    const action = blocked
      ? fix
        ? listingFixLabel(fix)
        : null
      : listing
        ? "Saving…"
        : !listed
          ? "List me"
          : draftTags.length
            ? null
            : "Add tags";

    const runAction = () => {
      if (blocked) {
        if (fix === "onboarding") {
          // Onboarding is not a route: it swaps the whole navigator.
          void openOnboarding("discover");
          return;
        }
        // The name lives in the profile editor on the Settings root, which
        // opens from local state there. This puts them one tap away.
        navigation.navigate("Root" as never, { screen: "SETTINGS" } as never);
        return;
      }
      if (listed) setPickingTags(true);
      else void setListed(true);
    };

    /**
     * YOU, AS THE FIRST ROW OF THE LIST.
     *
     * It was a rounded card floating above a list of edge-to-edge rows, which
     * is what made it look imported from another screen: the one boxed object
     * on a page that has no other boxes. Before that it was pinned over the
     * dock, where it permanently covered about two rows.
     *
     * So it is a row now, built from the SAME `styles.row` the people below
     * use. That is not a resemblance, it is the same style object, so the two
     * cannot drift apart. And it says the true thing: this page is people who
     * can be found, and you are one of them. Tapping you opens your card
     * exactly as tapping Sofia opens Sofia's.
     *
     * What separates you from them is deliberately small: a ring on your
     * avatar, your name in the accent, and a state dot. Anything louder and
     * you stop being a row.
     */
    // Live, or a reason it is not. Never the ONLY carrier of that difference:
    // the line says "Listed" or "Not listed" in words, so the dot is
    // reinforcement rather than information somebody could miss.
    const dotColor = blocked || !listed
      ? colors.text.disabled
      : warn
        ? colors.feedback.warning
        : colors.feedback.success;

    return (
      <PressableScale
        scaleTo={0.99}
        // Nothing to open while blocked: the card does not exist yet, so the
        // only thing to do is whatever the block's fix is.
        onPress={blocked ? runAction : () => setPickingTags(true)}
        disabled={(!!blocked && !fix) || listing}
        accessibilityRole="button"
        accessibilityLabel={
          blocked
            ? `You. ${state}. ${blocked}`
            : listed
              ? `You. Your card says ${saysFull}. Change it.`
              : `You. Not listed. Your card would say ${saysFull}.`
        }
        style={[styles.row, { borderBottomColor: colors.border.hairline }]}
      >
        {/* The ring is the whole of "this one is you". It holds the row's 40pt
            footprint rather than growing past it, so your text column starts
            on the same x as everybody else's: a 32pt avatar with the ring and
            its inset making up the difference. */}
        <View style={[styles.youRing, { borderColor: colors.action.primary }]}>
          <UserAvatar manifest={user?.avatarManifest} size={32} shape="square" />
        </View>

        <View style={styles.rowText}>
          <View style={styles.youNameRow}>
            {/* `title`, the same variant a person's name uses. The accent is
                the only difference, and it is doing the job the word "You"
                cannot do on its own at a glance. */}
            <Text variant="title" color="accent" numberOfLines={1}>
              You
            </Text>
            <View style={[styles.youDot, { backgroundColor: dotColor }]} />
          </View>
          <Text variant="bodySm" color="tertiary" numberOfLines={2}>
            {sub}
          </Text>
        </View>

        {/* `Asked` sits here on a person's row. Yours carries the one word for
            what tapping will do, in the same slot, at the same size. */}
        {action ? (
          <Text variant="caption" color="accent" style={styles.rowAsked}>
            {action}
          </Text>
        ) : null}

        <Icon
          name={icons.chevronRight}
          size={size.iconSm}
          color={colors.text.tertiary}
          style={styles.chevron}
        />
      </PressableScale>
    );
  };

  const firstName = (person: DiscoveryCandidate) => person.name.split(" ")[0];

  /**
   * One person, at the same weight the requests list gives one.
   *
   * IT USED TO CARRY FOUR TEXT ELEMENTS AND THREE CONTROLS: a reason line, two
   * labelled tag lines, an Ask button and an overflow. The requests list next
   * door said a name, one summary line and a chevron, and opened a sheet for
   * everything else — so two lists of the same kind of object were two
   * different designs, and the busier one was the one you scroll.
   *
   * The detail was never wrong, it was in the wrong place. A list is for
   * deciding what to open; `CandidateSheet` is what you opened. That move also
   * dissolved the asked/cancel problem rather than restyling it: there is no
   * trailing control left to get wrong.
   */
  const renderRow = (person: DiscoveryCandidate) => {
    const asked = !!person.requestId;
    // Same rule and same shape as the requests row: two labels and a count,
    // over at most two lines, so nothing can ellipsise.
    const summary = person.tags.length
      ? person.tags
        .slice(0, 2)
        .map((t) => t.label)
        .join(", ") + (person.tags.length > 2 ? ` +${person.tags.length - 2}` : "")
      : null;

    return (
      <PressableScale
        key={person.userId}
        scaleTo={0.99}
        onPress={() => setOpenCandidate(person)}
        accessibilityRole="button"
        accessibilityLabel={`${firstName(person)}, open to answer`}
        style={[styles.row, { borderBottomColor: colors.border.hairline }]}
      >
        <UserAvatar manifest={person.avatarManifest} size={40} shape="square" />
        <View style={styles.rowText}>
          <Text variant="title" numberOfLines={1}>
            {firstName(person)}
          </Text>
          {summary ? (
            <Text variant="bodySm" color="tertiary" numberOfLines={2}>
              {summary}
            </Text>
          ) : null}
        </View>
        {/* One word, no control. Seeing at a glance who you have already asked
            is worth a line of text; it is not worth a button, which is what the
            old row spent on it. */}
        {asked ? (
          <Text variant="caption" color="tertiary" style={styles.rowAsked}>
            Asked
          </Text>
        ) : null}
        <Icon
          name={icons.chevronRight}
          size={size.iconSm}
          color={colors.text.tertiary}
          style={styles.chevron}
        />
      </PressableScale>
    );
  };

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
       * ONE LINE, NO EMPTY STATE. This was a full medallion + headline +
       * paragraph + "Share your code" button, which is a lot of furniture for
       * a state that means "check back later" — and it landed directly under
       * the user's own row, so the screen's loudest thing was a picture of
       * what is missing. This only has to say that being early is fine.
       *
       * IT READS THE LISTING FLAG, because the first version said "You're on
       * the list" flat and kept saying it after the user unlisted themselves,
       * contradicting the row directly above it. An unknown profile (still
       * loading, or the fetch failed) takes the unlisted line: it claims
       * nothing, so it cannot be wrong.
       *
       * The copy still refuses the two claims the old version was careful
       * about: nothing about other people's WILLINGNESS (nobody turned anyone
       * down) and nothing about how fast the list grows (we do not know). The
       * invite share is not lost — it lives on Community, which is the screen
       * that owns the code.
       */
      return (
        <Text variant="body" color="secondary" center style={styles.emptyLine}>
          {profile?.discoverable
            ? "You're on the list. Others will show up here as they join."
            : "Nobody here yet. Others will show up as they join."}
        </Text>
      );
    }
    /**
     * ONE LIST. No featured card.
     *
     * There was a spotlight on the closest match and it was the only loud thing
     * on the screen, which was the argument for it. It goes because the page it
     * now lives on has a louder job: the other half is people waiting on an
     * answer, and featuring somebody you could ask above people you owe a reply
     * to inverts the urgency. The ranking survives — it is the order of the
     * list, which is where it started.
     */
    return (
      <View style={styles.list}>
        <View style={styles.roster}>{candidates.map(renderRow)}</View>
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
    // Embedded, the host owns the canvas, the status bar and the pager page
    // this sits in — a second `ScreenView` inside a paging ScrollView would try
    // to be its own screen and collapse to nothing.
    <Frame>
      {embedded ? null : <SchemeStatusBar />}
      <CustomScrollView onEndReached={loadMore} onScrollY={onScrollY}>
        {/* No dock clearance here: this is a PUSHED screen, so `CustomTabBar` is
            hidden (`getTabBarVisibility`) and the 120pt this used to reserve was
            120pt of dead space. What the bottom actually needs is breathing room
            plus the safe area. */}
        <View
          style={[
            styles.scrollBody,
            {
              // Zero when embedded: the host's header is a fixed overlay that
              // owns the status-bar inset, and `header` here is the placeholder
              // reserving its height. Adding the inset again would push this
              // half down by the notch a second time.
              paddingTop: embedded ? 0 : insets.top + space.inlineGap,
              // Clears the pinned status bar. Without the reserve the last card
              // sits under it and the "Share your code" button is unreachable,
              // which is the bug that started this.
              // Only the dock to clear now. The listing bar moved into the
              // header, so there is no longer a floating thing above the dock
              // for the last row to hide behind.
              paddingBottom:
                space.sectionGap + (embedded ? size.tabBarSafe : insets.bottom),
            },
          ]}
        >
          {/* Embedded this is a spacer, not a header: the host draws one fixed
              header above the pager for both halves. Standalone, the canonical
              back bar, matching PageHeader's geometry exactly (`size.backBtn`
              tall, DS `IconButton`) so this screen's header sits at the same
              height as every other screen's. */}
          {embedded ? (
            header
          ) : (
            <View style={styles.backBar}>
              <IconButton name="arrow-left" onPress={() => navigation.goBack()} />
            </View>
          )}

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
          {/* The poster title belongs to the whole page, so embedded it comes
              from the host and this half draws none. Standalone (which nothing
              is any more, but the route still compiles) it keeps its own. */}
          {embedded ? null : (
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
          )}

          {/* Your own card, in the header rather than pinned over the list.
              Above `body()` so it still shows when the list is empty or failed
              — "nobody to show" is exactly when being findable yourself
              matters most. */}
          {renderStatusBar()}

          {/* Above the list, and outside `body()`, so it still shows when the
              list is empty or failed — "nobody to show" is exactly when being
              findable yourself matters most. */}
          {body()}
        </View>
      </CustomScrollView>

      {/* Opaque cap so scrolled content passes BEHIND the system clock rather
          than through it — the one thing `Page` was still providing. Embedded,
          the host's fixed header is already an opaque band across the top of
          the screen and does this job. */}
      {embedded ? null : (
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
      )}

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


      {/* Everything the row used to say, in the place you opened. Same sheet
          shape as a buddy request, because it is the same kind of object. */}
      <CandidateSheet
        person={openCandidate}
        busy={asking !== null}
        onClose={() => setOpenCandidate(null)}
        onAsk={(p) => {
          setOpenCandidate(null);
          void ask(p);
        }}
        onWithdraw={(p) => {
          setOpenCandidate(null);
          void withdraw(p);
        }}
        // Report opens another native Modal, so it waits for this one to go.
        onReport={(p) => {
          setOpenCandidate(null);
          afterSheetDismissed.current = () => setReporting(p);
        }}
        onDismissed={() => {
          const run = afterSheetDismissed.current;
          afterSheetDismissed.current = null;
          run?.();
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
    </Frame>
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
  // ── You, as the first row ────────────────────────────────────────────────
  // No styles of its own for the row itself: it uses `styles.row` below, which
  // is the people's. These three are only the marks that say which row is you.
  //
  // 40 outside, so the row's avatar column is the same width as everybody
  // else's and the text lines up. 2 of border and 2 of inset leave the avatar
  // itself at 32.
  youRing: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: borderWidth.thick,
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  youNameRow: { flexDirection: "row", alignItems: "center", gap: space.inlineGap },
  // 7, not 8: an even dot beside this type sat a hair proud of the cap height
  // and read as a bullet point rather than a status light.
  youDot: { width: 7, height: 7, borderRadius: 4 },
  list: { gap: spacing.sm },
  // The whole empty state is this one line, so it needs its own breathing room
  // where the medallion's 28pt of padding used to be.
  emptyLine: { paddingVertical: spacing.xl, paddingHorizontal: space.screenX },

  // ── The spotlight ────────────────────────────────────────────────────────
  // A hairline in the accent, not a fill. The card is already a step above the
  // canvas; tinting the whole surface as well would make the ONE solid button
  // on the screen compete with the thing it sits on.
  spotlight: { gap: spacing.md, borderWidth: borderWidth.hairline },
  // `flex-start`, not `center`: the overflow glyph belongs at the top of the
  // card, and centring the row would float it against the middle of a 64pt tile.
  spotTop: { flexDirection: "row", alignItems: "flex-start", gap: space.iconText },
  cardText: { flex: 1, gap: 2, paddingTop: spacing.xs },

  // ── The roster ───────────────────────────────────────────────────────────
  divider: { flexDirection: "row", alignItems: "center", gap: space.iconText, marginTop: spacing.md },
  dividerLine: { flex: 1, height: borderWidth.hairline },
  roster: { marginTop: spacing.xs },
  // The hairline is the only thing separating neighbours, so it goes on every
  // row including the last: the list continues below the fold, and a missing
  // rule on the final visible row reads as the end of it.
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.iconText,
    paddingVertical: space.rowGap,
    borderBottomWidth: borderWidth.hairline,
  },
  rowText: { flex: 1, minWidth: 0, gap: 2 },
  rowAsked: { flex: 0 },
  // Optically on the name rather than the middle of a block that runs one line
  // or two, so it holds still as you read down the list.
  chevron: { marginTop: 3 },
  // Right-aligned and top-anchored, so the button lines up with the name
  // rather than drifting down beside a three-line tag block.
  rowActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },

  moreAction: { paddingTop: spacing.xxs },

  // ── Already asked ────────────────────────────────────────────────────────
  // Same height and radius as `Button` size sm, so the trailing column is one
  // shape at one height whether or not you have asked. Transparent with a
  // hairline rather than a fill: it is a state, and a filled pill would read as
  // something to press.
  settled: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: space.rowGap,
    borderRadius: radius.full,
    borderWidth: borderWidth.hairline,
  },
});
