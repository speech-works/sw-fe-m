import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  getPackBrochure,
  getPackProgress,
  getRecommendedPack,
} from "../../api/packs";
import { isModuleOfferable } from "../../util/packs/dayLock";

/** The shape both a pack's own modules and a brochure outline share. */
interface ModuleLike {
  id: string;
  orderIndex: number;
  title: string;
  description?: string;
}

export interface ActiveProgram {
  packId: string;
  title: string;
  /** One or two lines of what the arc is. See the note in InProgressSlide. */
  description: string | null;
  /**
   * The card offers a restart instead of a "next day", and `openProgram`
   * performs one before it navigates.
   *
   * True for a pack the recommender itself calls a refresher, and ALSO for a
   * finished pack whose next unfinished day is one the server refuses to start
   * (a skipped optional day). Both have the same single route forward, so they
   * get the same card.
   */
  isRefresher: boolean;
  /** The server's icon key for this program. Never indexed directly. */
  icon: string | null;
  /** The day they are on, or the last one when everything is done. */
  nextModule: ModuleLike | null;
  moduleOrder: number;
  totalModules: number;
  /** 0 to 1. Zero on a refresher, which starts the arc again. */
  percentComplete: number;
  /**
   * `nextModule` is the next UNFINISHED day, which on an arc pack is regularly
   * a day that has not opened yet — you get there by finishing today. The card
   * used to advertise it as "NEXT UP" behind a "Continue" button, which is how
   * people ended up on the day-locked screen being told the work they had just
   * done was still waiting for them.
   *
   * Null means we could not tell (no progress call, or a pack with no arc), and
   * the card behaves exactly as it did before.
   */
  nextModuleLocked: boolean | null;
  /** The day `nextModule` belongs to, for saying WHICH day opens later. */
  nextModuleDay: number | null;
  /** Which day is open by the clock, so the card can count the wait. */
  currentDay: number | null;
  /**
   * When the next day unlocks, so the card can say how LONG the wait is
   * instead of "tomorrow" — which is wrong after midnight and wrong anyway,
   * because the gate is 24h from the start, not a calendar date.
   */
  nextDayOpensAt: Date | string | null;
}

export interface ActiveProgramState {
  loading: boolean;
  /** A program they own and have not finished. Null when there is none. */
  program: ActiveProgram | null;
  /**
   * They own everything and have been through it. A real state with its own
   * card, and the reason this hook returns more than just `program`: without
   * it, somebody who had finished everything got nothing at all on Home.
   */
  allComplete: boolean;
}

/**
 * ===========================================================================
 * THE PROGRAM THEY ARE IN THE MIDDLE OF
 * ---------------------------------------------------------------------------
 * Lifted out of SmartRecommendationCard so the For-you carousel can lead with
 * it instead of a second card sitting above the shelf. The derivation below is
 * PORTED VERBATIM, deliberately: the sort, the "first module that is not
 * completed", the refresher override and the brochure fallback were each fixed
 * for a reason, and a rewrite would quietly lose those reasons.
 *
 * ── WHY THE BROCHURE AND NOT getPack ───────────────────────────────────────
 * We need the module count and their order to draw a ratio. `getPack` is
 * owners-only, so calling it here would 402 for exactly the people a
 * recommendation is meant to reach. The brochure carries titles and order and
 * no blocks, which is all this needs.
 * ===========================================================================
 */
export function useActiveProgram(): ActiveProgramState {
  const [state, setState] = useState<ActiveProgramState>({
    loading: true,
    program: null,
    allComplete: false,
  });

  useFocusEffect(
    useCallback(() => {
      let alive = true;

      void (async () => {
        try {
          const rec = await getRecommendedPack();
          if (!alive) return;

          if (!rec?.pack) {
            setState({
              loading: false,
              program: null,
              allComplete: rec?.state === "ALL_COMPLETE",
            });
            return;
          }

          let modules: ModuleLike[] = rec.pack.modules?.length
            ? rec.pack.modules
            : [];

          if (modules.length === 0) {
            try {
              const brochure = await getPackBrochure(rec.pack.id);
              if (brochure?.modules) modules = brochure.modules as ModuleLike[];
            } catch (err) {
              console.error("Failed to fetch pack brochure outline", err);
            }
          }

          const progress = await getPackProgress(rec.pack.id).catch(() => null);
          if (!alive) return;

          const completed =
            progress?.modules.filter((m) => m.status === "COMPLETED") ?? [];
          const total = modules.length;

          const sorted = [...modules].sort(
            (a, b) => a.orderIndex - b.orderIndex,
          );

          const progressFor = (id: string) =>
            progress?.modules.find((pm) => pm.moduleId === id);

          let current = sorted.find((m) => {
            const p = progressFor(m.id);
            return !p || p.status !== "COMPLETED";
          });

          /**
           * ── NEVER ADVERTISE A DAY THE SERVER WILL REFUSE ────────────────────
           * `current` is the first module that is not COMPLETED, and that is not
           * always a module `startModule` will open. An OPTIONAL day can be
           * skipped, so a pack reaches COMPLETED with that day still undone —
           * and once the pack is finished the clock sits past every day, so
           * `unlocked` is true for that day and cannot filter it out. The card
           * therefore drew it as "NEXT UP" behind a live press, and the one tap
           * it invited ended on PackCompletedError (409). Interview Ready's day
           * 10 is this shape.
           *
           * The pack page and the success screen already share one rule for
           * this; Home was the surface still deciding on its own.
           *
           * `unlocked !== false` keeps the two reasons apart. A day the CLOCK
           * has not reached is a wait, and the card says so; it must never be
           * turned into an offer to restart, which would move `startedAt` and
           * re-lock the run they are in the middle of. A skipped day on a
           * finished pack has no wait to report — a restart is the only route
           * back to it, which is what a refresher already is.
           */
          const chosen = current ? progressFor(current.id) : undefined;
          const skippedDay =
            !!chosen &&
            chosen.unlocked !== false &&
            !isModuleOfferable(chosen, {
              packStatus: progress?.packStatus,
              arcDays: progress?.arcDays ?? null,
            });

          const refresher = !!rec.isRefresher || skippedDay;
          if (refresher) current = sorted[0];

          let percentComplete = total > 0 ? completed.length / total : 0;
          if (progress?.packStatus === "COMPLETED") percentComplete = 1;
          if (refresher) percentComplete = 0;

          const nextModule = current ?? sorted[sorted.length - 1] ?? null;

          // Has that day actually opened? The progress payload has always
          // carried `unlocked`; reading it is the difference between "Continue"
          // and a locked screen one tap later. A refresher restarts the arc, so
          // its day 1 is open by definition.
          const nextProgress = nextModule
            ? progressFor(nextModule.id)
            : undefined;
          const nextModuleLocked =
            refresher || !nextProgress || nextProgress.unlocked == null
              ? null
              : !nextProgress.unlocked;

          setState({
            loading: false,
            allComplete: false,
            program: {
              packId: rec.pack.id,
              title: rec.pack.title,
              description: rec.pack.description ?? null,
              isRefresher: refresher,
              icon: rec.pack.icon ?? null,
              nextModule,
              moduleOrder: nextModule ? nextModule.orderIndex : total,
              totalModules: total,
              percentComplete,
              nextModuleLocked,
              nextModuleDay: nextProgress?.dayIndex ?? null,
              currentDay: progress?.currentDay ?? null,
              nextDayOpensAt: progress?.nextDayOpensAt ?? null,
            },
          });
        } catch (err) {
          if (!alive) return;
          // The shelf still has offers to show. A failed recommendation must
          // not take the whole section down with it.
          console.error("Failed to load the active program", err);
          setState({ loading: false, program: null, allComplete: false });
        }
      })();

      return () => {
        alive = false;
      };
    }, []),
  );

  return state;
}
