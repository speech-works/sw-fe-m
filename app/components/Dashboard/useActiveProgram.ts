import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  getPackBrochure,
  getPackProgress,
  getRecommendedPack,
} from "../../api/packs";

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
  /** Only for the arc's tone; the slide does not print it. */
  isRefresher: boolean;
  /** The server's icon key for this program. Never indexed directly. */
  icon: string | null;
  /** The day they are on, or the last one when everything is done. */
  nextModule: ModuleLike | null;
  moduleOrder: number;
  totalModules: number;
  /** 0 to 1. Zero on a refresher, which starts the arc again. */
  percentComplete: number;
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

          let percentComplete = total > 0 ? completed.length / total : 0;
          if (progress?.packStatus === "COMPLETED") percentComplete = 1;
          if (rec.isRefresher) percentComplete = 0;

          const sorted = [...modules].sort(
            (a, b) => a.orderIndex - b.orderIndex,
          );

          let current = sorted.find((m) => {
            const p = progress?.modules.find((pm) => pm.moduleId === m.id);
            return !p || p.status !== "COMPLETED";
          });
          if (rec.isRefresher) current = sorted[0];

          const nextModule = current ?? sorted[sorted.length - 1] ?? null;

          setState({
            loading: false,
            allComplete: false,
            program: {
              packId: rec.pack.id,
              title: rec.pack.title,
              description: rec.pack.description ?? null,
              isRefresher: !!rec.isRefresher,
              icon: rec.pack.icon ?? null,
              nextModule,
              moduleOrder: nextModule ? nextModule.orderIndex : total,
              totalModules: total,
              percentComplete,
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
