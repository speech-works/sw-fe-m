import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  useTheme,
  spacing,
  radius,
  Page,
  Text,
  Chip,
  Toggle,
  Button,
  Banner,
  Spinner,
  ErrorState,
} from "../../../design-system";
import PressableScale from "../../../components/PressableScale";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import {
  getDiscoveryProfile,
  setDiscoveryProfile,
  type DiscoveryProfile,
} from "../../../api/buddies";
import { apiErrorMessage } from "../../../util/functions/apiError";
import { showErrorBottomSheet } from "../../../util/functions/bottomSheet";
import { openOnboarding } from "../../../util/functions/openOnboarding";
import { listingFix, listingFixLabel } from "../../../util/functions/listingBlock";
import {
  TAG_LABELS,
  MAX_DISCOVERY_TAGS,
  SITUATION_TAGS,
  GOAL_TAGS,
} from "../../../constants/discoveryTags";

/**
 * Being findable — off unless you say otherwise.
 *
 * Appearing in a list inside a stuttering-support app is itself a disclosure,
 * so this is opt-in for everyone including existing users, and the card shows
 * only what you pick here. The app never republishes your onboarding answers to
 * strangers: those are the same signals the recommendation trace is admin-gated
 * for. What you see below are SUGGESTIONS drawn from your own answers — nothing
 * is published until you choose it.
 */
const Discoverability = () => {
  const navigation = useNavigation<SettingsStackNavigationProp<"Discoverability">>();
  const { colors } = useTheme();

  const [profile, setProfile] = useState<DiscoveryProfile | null>(null);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const p = await getDiscoveryProfile();
      setProfile(p);
      setDiscoverable(p.discoverable);
      setTags(p.tags);
    } catch {
      setError(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleTag = (tag: string) => {
    setTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_DISCOVERY_TAGS) return prev;
      return [...prev, tag];
    });
  };

  const save = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    try {
      const updated = await setDiscoveryProfile(discoverable, tags);
      setProfile(updated);
      setDiscoverable(updated.discoverable);
      setTags(updated.tags);
      navigation.goBack();
    } catch (e) {
      showErrorBottomSheet("Couldn't save", apiErrorMessage(e, "Please try again."));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  if (profile === null && !error) {
    return (
      <Page title="Being findable" onBack={() => navigation.goBack()}>
        <Spinner label="Loading…" />
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="Being findable" onBack={() => navigation.goBack()}>
        <ErrorState
          title="Couldn't load"
          message="Check your connection and try again."
          onRetry={load}
        />
      </Page>
    );
  }

  /**
   * The same two questions the Discover sheet asks, over the same groups.
   *
   * This screen used to show `profile.suggestions` alone, in one flat grid.
   * Two things were wrong with that. Anyone the server had nothing to suggest
   * for got an empty picker and no way to describe themselves, even though the
   * server would have accepted any tag in the vocabulary. And a single grid of
   * thirteen mixes situations you practise with outcomes you want, which are
   * not the same kind of answer and should not look like one.
   */
  const question = (title: string, hint: string, ids: readonly string[]) => (
    <View style={styles.tagSection}>
      <Text variant="title">{title}</Text>
      <Text variant="bodySm" color="secondary">
        {hint}
      </Text>
      <View style={styles.chipWrap}>
        {ids.map((tag) => (
          <PressableScale key={tag} onPress={() => toggleTag(tag)}>
            <Chip label={TAG_LABELS[tag] ?? tag} selected={tags.includes(tag)} />
          </PressableScale>
        ))}
      </View>
    </View>
  );

  return (
    <Page
      title="Being findable"
      description="Off unless you turn it on. Only people looking for a buddy see this."
      onBack={() => navigation.goBack()}
      footer={
        <Button
          label={saving ? "Saving…" : "Save"}
          disabled={saving || !!profile?.blockedReason}
          onPress={save}
        />
      }
    >
      {profile?.blockedReason ? (
        <View style={styles.blocked}>
          <Banner
            tone="warning"
            icon="alert-triangle"
            title="You can't be listed yet"
            message={profile.blockedReason}
          />
          {/* Telling someone what is missing without a way to fix it just moves
              the dead end. Onboarding is not a route — it swaps the whole
              navigator — so this goes through the one helper that knows how to
              do that properly.

              The reason-to-fix test used to be an inline `includes(...)` here,
              known only to this file. Discover needed the same card and the
              same button, so it moved into `listingFix` where a reworded server
              message breaks one function instead of quietly dropping the button
              from whichever screen nobody re-checked. The name case has no
              button HERE on purpose: you are already in Settings, where the
              profile editor lives. */}
          {listingFix(profile.blockedReason) === "onboarding" ? (
            <Button
              variant="secondary"
              label={listingFixLabel("onboarding") ?? "Finish setting up"}
              onPress={() => void openOnboarding("discoverability")}
            />
          ) : null}
        </View>
      ) : null}

      <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text variant="title">Let others find me</Text>
            <Text variant="bodySm" color="secondary">
              You&apos;ll appear to people looking for a practice buddy. They see
              your first name, your avatar, and whatever you pick below.
            </Text>
          </View>
          <Toggle
            value={discoverable}
            disabled={!!profile?.blockedReason}
            onChange={() => setDiscoverable((v) => !v)}
          />
        </View>
      </View>

      {discoverable ? (
        <>
          <Text variant="bodySm" color="secondary" style={styles.tagIntro}>
            Pick up to {MAX_DISCOVERY_TAGS}. Nothing here is shared until you
            choose it, and you can change it any time.
          </Text>
          {question(
            "What are you practising?",
            "The ones you actually work on.",
            SITUATION_TAGS,
          )}
          {question("What are you hoping for?", "One is plenty.", GOAL_TAGS)}
        </>
      ) : null}
    </Page>
  );
};

export default Discoverability;

const styles = StyleSheet.create({
  blocked: {
    gap: spacing.md,
  },
  group: { borderRadius: radius.card, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg,
  },
  rowText: { flex: 1, gap: 4 },
  tagSection: { gap: spacing.sm },
  tagIntro: { marginBottom: spacing.xs },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
