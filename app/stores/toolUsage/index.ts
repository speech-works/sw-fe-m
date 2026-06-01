import { create } from "zustand";
import { ToolType } from "../../api/tools/types";

/**
 * In-memory (NOT persisted) tracker for which fluency tools were *actually
 * activated* (audio started — not merely opening the tool panel) during a
 * given practice activity. Keyed by activityId so the screen that toggles a
 * tool and the completion handler can be decoupled.
 *
 * Consumed once at activity completion and sent as `toolsUsed`, then cleared.
 */
interface ToolUsageState {
  usedByActivity: Record<string, ToolType[]>;
  recordToolUsed: (activityId: string, tool: ToolType) => void;
  getToolsUsed: (activityId: string) => ToolType[];
  clearActivity: (activityId: string) => void;
}

export const useToolUsageStore = create<ToolUsageState>((set, get) => ({
  usedByActivity: {},

  recordToolUsed: (activityId, tool) => {
    if (!activityId) return;
    set((state) => {
      const current = state.usedByActivity[activityId] ?? [];
      if (current.includes(tool)) return state;
      return {
        usedByActivity: {
          ...state.usedByActivity,
          [activityId]: [...current, tool],
        },
      };
    });
  },

  getToolsUsed: (activityId) => get().usedByActivity[activityId] ?? [],

  clearActivity: (activityId) =>
    set((state) => {
      if (!(activityId in state.usedByActivity)) return state;
      const next = { ...state.usedByActivity };
      delete next[activityId];
      return { usedByActivity: next };
    }),
}));
