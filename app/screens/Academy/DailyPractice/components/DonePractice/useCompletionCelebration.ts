import { useEffect, useRef, useState } from "react";
import { getLevelStage, getMyUser, LevelStage, User } from "../../../../../api/users";
import { useCelebrationStore } from "../../../../../stores/celebration";
import { useUserStore } from "../../../../../stores/user";

/**
 * Detects whether a completed practice pushed the user over a level boundary,
 * so DonePractice can fire the (rare) level-up takeover. Practice completions
 * are frequent, so the routine finish stays a plain warm screen — only a real
 * level-up earns a celebration.
 *
 * Uses the pre-completion snapshot captured at the API chokepoint
 * (completePracticeActivity / completeMirrorWorkActivity) diffed against a
 * fresh /users/me. Design rules (do not "fix" differently):
 * - Diffs via `getMyUser()` directly — `fetchUser()` returns void and its
 *   in-flight guard can silently skip while the caller's own refetch runs.
 * - XP/level can be applied asynchronously server-side → one 1200ms retry.
 * - Consume-once + 5-min staleness so a pack flow that navigates away before
 *   DonePractice mounts can't leak a celebration into a later session.
 * - Every failure degrades silently to no celebration.
 */

const SNAPSHOT_MAX_AGE_MS = 5 * 60_000;
const XP_RETRY_DELAY_MS = 1200;

export interface CompletionCelebration {
  leveledUp: boolean;
  newLevel: number;
  stageTitle: string | null;
}

const NONE: CompletionCelebration = { leveledUp: false, newLevel: 1, stageTitle: null };

export function useCompletionCelebration({ enabled }: { enabled: boolean }): CompletionCelebration {
  const [result, setResult] = useState<CompletionCelebration>(NONE);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!enabled) {
      // Aborted flow — discard any lingering snapshot so it can't leak.
      useCelebrationStore.getState().clear();
      setResult(NONE);
      return;
    }

    const snap = useCelebrationStore.getState().consume();
    if (!snap || Date.now() - snap.capturedAt > SNAPSHOT_MAX_AGE_MS) {
      setResult(NONE);
      return;
    }

    const finish = (fresh: User, stage: LevelStage | null) => {
      if (cancelled) return;
      // Sync the store with the fresh totals (setUser, not fetchUser — the
      // latter would double-run stamina alert handling).
      useUserStore.getState().setUser(fresh);
      const newLevel = fresh.level ?? snap.level;
      setResult({
        leveledUp: newLevel > snap.level,
        newLevel,
        stageTitle: stage?.title ?? null,
      });
    };

    const run = async () => {
      const [userResult, stageResult] = await Promise.allSettled([
        getMyUser(),
        getLevelStage(),
      ]);
      if (cancelled) return;

      if (userResult.status === "rejected") {
        console.warn("[Celebration] Could not fetch fresh user:", userResult.reason);
        setResult(NONE);
        return;
      }

      const stage = stageResult.status === "fulfilled" ? stageResult.value : null;
      const fresh = userResult.value;
      const changed =
        (fresh.totalXp ?? 0) > snap.totalXp || (fresh.level ?? snap.level) > snap.level;

      if (!changed) {
        // XP/level may be applied asynchronously server-side — retry once.
        retryTimer.current = setTimeout(async () => {
          try {
            const retried = await getMyUser();
            if (!cancelled) finish(retried, stage);
          } catch (error) {
            console.warn("[Celebration] Retry fetch failed:", error);
            if (!cancelled) setResult(NONE);
          }
        }, XP_RETRY_DELAY_MS);
        return;
      }

      finish(fresh, stage);
    };

    run().catch((error) => {
      console.warn("[Celebration] Unexpected celebration failure:", error);
      if (!cancelled) setResult(NONE);
    });

    return () => {
      cancelled = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return result;
}
