import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  useTheme,
  spacing,
  space,
  radius,
  Page,
  Surface,
  Text,
  Chip,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Spinner,
  Toggle,
  icons,
} from "../../design-system";
import CustomScrollView from "../../components/CustomScrollView";
import { UserAvatar } from "../../components/UserAvatar";
import ReportSheet from "../../components/ReportSheet";
import {
  discoverBuddies,
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
        <Surface level="elevated" padded rounded="card" style={styles.consent}>
          <Text variant="title">Want to be findable too?</Text>
          <Text variant="bodySm" color="secondary">
            Right now you can see other people, but they can&apos;t see you. If
            you turn this on, they can reach out to you as well — they&apos;ll
            see your first name, your avatar, and anything you choose to add.
            You can turn it off whenever you like.
          </Text>
          <View style={styles.consentActions}>
            <Button
              label={listing ? "Saving…" : "Yes, list me"}
              size="sm"
              fullWidth={false}
              disabled={listing}
              onPress={() => setListed(true)}
            />
            <Button
              label="Not now"
              variant="ghost"
              size="sm"
              fullWidth={false}
              disabled={listing}
              // Records only that we asked. Browsing continues untouched, and
              // the quiet row below keeps the door open without another ask.
              onPress={markOffered}
            />
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

  const renderCard = (person: DiscoveryCandidate) => (
    <Surface
      key={person.userId}
      level="default"
      padded
      bordered
      rounded="card"
      style={styles.card}
    >
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { borderColor: colors.border.default }]}>
          <UserAvatar manifest={person.avatarManifest} size={44} />
        </View>
        <View style={styles.cardText}>
          <Text variant="title" numberOfLines={1}>
            {person.name.split(" ")[0]}
          </Text>
          {/* Null means we have nothing honest to say — show nothing at all
              rather than a softer line. */}
          {person.matchReason ? (
            <Text variant="bodySm" color="secondary">{person.matchReason}</Text>
          ) : null}
        </View>
      </View>

      {person.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {person.tags.slice(0, 2).map((t) => (
            <Chip key={t} label={t} />
          ))}
        </View>
      ) : null}

      <View style={styles.cardActions}>
        <Button
          label={asking === person.userId ? "Sending…" : "Ask to pair"}
          size="sm"
          fullWidth={false}
          disabled={asking !== null}
          onPress={() => ask(person)}
        />
        <Button
          label="Report"
          variant="ghost"
          size="sm"
          fullWidth={false}
          onPress={() => setReporting(person)}
        />
      </View>
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
      // A genuinely common answer, not a failure: the pool is opt-in and small.
      return (
        <EmptyState
          icon={icons.community}
          title="No one to show yet"
          message="Not many people are open to new buddies right now. Try again in a few days, or invite someone you know with your code."
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
    <Page title="Find a buddy" onBack={() => navigation.goBack()} scroll={false}>
      <CustomScrollView onEndReached={loadMore}>
        <View style={styles.scrollBody}>
          {/* Above the list, and outside `body()`, so it still shows when the
              list is empty or failed — "nobody to show" is exactly when being
              findable yourself matters most. */}
          {renderConsent()}
          {body()}
        </View>
      </CustomScrollView>

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
    </Page>
  );
};

export default Discover;

const styles = StyleSheet.create({
  scrollBody: {
    paddingHorizontal: space.screenX,
    paddingBottom: 120,
    gap: space.groupGap,
  },
  consent: { gap: spacing.md },
  consentActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  quietRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  quietText: { flex: 1, gap: 2 },
  list: { gap: space.groupGap },
  card: { gap: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "center", gap: space.iconText },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  cardText: { flex: 1, gap: 2 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  cardActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
