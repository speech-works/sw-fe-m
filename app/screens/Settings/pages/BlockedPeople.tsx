import { useFocusEffect, useNavigation } from "@react-navigation/native";
import React, { useCallback, useRef, useState } from "react";
import { RefreshControl, StyleSheet, View } from "react-native";
import Reanimated, { FadeOut } from "react-native-reanimated";

import {
  useTheme,
  useMotion,
  duration,
  radius,
  Page,
  ListItem,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Spinner,
} from "../../../design-system";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import {
  getBlockedUsers,
  unblockUser,
  type BlockedUser,
} from "../../../api/moderation";
import { apiErrorMessage } from "../../../util/functions/apiError";
import { showErrorBottomSheet } from "../../../util/functions/bottomSheet";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";
import { removeBlocked, blockedOnLabel } from "./BlockedPeople.helpers";

/**
 * Blocked people — the undo half of blocking.
 *
 * Lives in Settings rather than the Community tab on purpose: the Community
 * "Us" panel only renders while you are PAIRED, and blocking unpairs you. Put
 * the list there and a block would hide its own undo. It also has to be
 * reachable, and visible, before you have ever blocked anyone — an App Review
 * tester needs to find it without first performing a block.
 */
const BlockedPeople = () => {
  const navigation = useNavigation<SettingsStackNavigationProp<"BlockedPeople">>();
  const { colors } = useTheme();
  const m = useMotion();

  const [rows, setRows] = useState<BlockedUser[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<BlockedUser | null>(null);
  const unblocking = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setError(false);
      setRows(await getBlockedUsers());
    } catch {
      setError(true);
    }
  }, []);

  // Refetch on focus so a block just performed in Community is already here.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const confirmUnblock = async () => {
    const target = pending;
    setPending(null);
    if (!target || unblocking.current.has(target.userId)) return;
    unblocking.current.add(target.userId);

    const prev = rows ?? [];
    setRows(removeBlocked(prev, target.userId));
    try {
      await unblockUser(target.userId);
      track(ANALYTICS_EVENTS.BUDDY_UNBLOCKED, { source: "settings" });
    } catch (e) {
      // DO roll back, unlike the report path in Timeline. There, keeping
      // content hidden on failure is still the right outcome. Here the opposite
      // holds: showing someone as unblocked while they are still blocked is a
      // lie the user will act on ("why can't they send me a code?").
      setRows(prev);
      showErrorBottomSheet("Couldn't unblock", apiErrorMessage(e, "Please try again."));
    } finally {
      unblocking.current.delete(target.userId);
    }
  };

  const body = () => {
    if (rows === null && !error) return <Spinner label="Loading…" />;
    if (error && !rows?.length) {
      return (
        <ErrorState
          title="Couldn't load"
          message="Check your connection and try again."
          onRetry={load}
        />
      );
    }
    if (!rows?.length) {
      return (
        <EmptyState
          icon="users"
          title="No one's blocked"
          message="People you block will show up here. You can unblock them any time."
        />
      );
    }
    return (
      <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
        {rows.map((row, i, arr) => (
          <Reanimated.View
            key={row.userId}
            layout={m.layout()}
            exiting={FadeOut.duration(duration.sheetOut)}
          >
            <ListItem
              label={row.name}
              sublabel={blockedOnLabel(row.createdAt)}
              divider={i < arr.length - 1}
              disabled={unblocking.current.has(row.userId)}
              right={
                <Button
                  label="Unblock"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onPress={() => setPending(row)}
                />
              }
            />
          </Reanimated.View>
        ))}
      </View>
    );
  };

  return (
    <Page
      title="Blocked people"
      description="They can't pair with you or see your posts."
      onBack={() => navigation.goBack()}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text.secondary} />
      }
    >
      {body()}

      <Dialog
        visible={pending !== null}
        onClose={() => setPending(null)}
        title={`Unblock ${pending?.name?.split(" ")[0] ?? "them"}?`}
        message="They'll be able to send you an invite code again. You won't be paired automatically — you'd both have to choose to."
        cancelLabel="Cancel"
        confirmLabel="Unblock"
        // NOT destructive: unblocking is the recovery, not the damage.
        onConfirm={confirmUnblock}
      />
    </Page>
  );
};

export default BlockedPeople;

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
