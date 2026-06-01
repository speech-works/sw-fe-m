import { useEffect, useRef, useState } from "react";
import { ToolType, ToolNudgeDirective } from "../api/tools/types";
import { useToolConsentStore } from "../stores/toolConsent";
import { useToolUsageStore } from "../stores/toolUsage";
import { useUserStore } from "../stores/user";
import { dismissToolNudge } from "../api/users";
import { track } from "../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../util/analytics/analyticsEvents";

/** Tools subject to the consent gate + over-reliance nudge (DAF / Chorus). */
export const MONITORED_TOOLS: ToolType[] = [ToolType.DAF, ToolType.CHORUS];

/**
 * Shared wiring for the fluency-aid over-reliance guardrails, reused across all
 * tool-bearing practice screens (reading variants, Twister, Library technique).
 *
 * A screen wires these primitives to its own tool-toggle + start logic:
 *  - `requireConsent(tool)` — call before opening a tool; returns false (and
 *    shows the consent modal) the first time a monitored tool is selected.
 *  - `acknowledgeConsent(proceed)` — the modal's onAcknowledge.
 *  - `markToolActivated(tool)` — call when a tool's audio actually starts.
 *  - `consumeToolsUsed()` — read tools used (for the completion payload).
 *  - nudge: `toolNudge`, `nudgeVisible`, `handleNudgeTryWithout(start)`,
 *    `handleNudgeDismiss()`.
 *  - focus mode: `focusMode`, `toolsExpanded`, `setToolsExpanded`, `enterFocusMode`.
 *
 * Pass `activeFlags` (the live on/off state of each tool) and usage recording
 * happens automatically — no need to instrument each activation handler.
 */
export function useToolGuardrails(
  currentActivityId: string | null,
  activeFlags?: Partial<Record<ToolType, boolean>>,
) {
  const { hasConsented, markConsented } = useToolConsentStore();
  const recordToolUsed = useToolUsageStore((s) => s.recordToolUsed);
  const getToolsUsed = useToolUsageStore((s) => s.getToolsUsed);
  const clearActivity = useToolUsageStore((s) => s.clearActivity);
  const { user } = useUserStore();

  // Auto-record usage the moment a tool becomes active (deduped in the store).
  // Covers every screen uniformly without touching its toggle handlers.
  const dafActive = !!activeFlags?.[ToolType.DAF];
  const metronomeActive = !!activeFlags?.[ToolType.METRONOME];
  const chorusActive = !!activeFlags?.[ToolType.CHORUS];
  useEffect(() => {
    if (currentActivityId && dafActive) recordToolUsed(currentActivityId, ToolType.DAF);
  }, [currentActivityId, dafActive]);
  useEffect(() => {
    if (currentActivityId && metronomeActive)
      recordToolUsed(currentActivityId, ToolType.METRONOME);
  }, [currentActivityId, metronomeActive]);
  useEffect(() => {
    if (currentActivityId && chorusActive)
      recordToolUsed(currentActivityId, ToolType.CHORUS);
  }, [currentActivityId, chorusActive]);

  const [consentTool, setConsentTool] = useState<ToolType | null>(null);
  const pendingToolRef = useRef<ToolType | null>(null);

  const [nudgeHidden, setNudgeHidden] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [toolsExpanded, setToolsExpanded] = useState(true);

  const toolNudge: ToolNudgeDirective | null = user?.toolNudge ?? null;
  const nudgeVisible = !!toolNudge && !nudgeHidden;

  const isMonitoredTool = (tool: string): tool is ToolType =>
    MONITORED_TOOLS.includes(tool as ToolType);

  const markToolActivated = (tool: ToolType) => {
    if (currentActivityId) recordToolUsed(currentActivityId, tool);
  };

  /** Returns true if the tool may proceed; false if consent intercepted. */
  const requireConsent = (toolName: string): boolean => {
    if (isMonitoredTool(toolName) && !hasConsented(toolName)) {
      pendingToolRef.current = toolName;
      setConsentTool(toolName);
      track(ANALYTICS_EVENTS.TOOL_CONSENT_SHOWN, { tool: toolName });
      return false;
    }
    return true;
  };

  /** Wire to the consent modal's onAcknowledge; `proceed` opens the tool. */
  const acknowledgeConsent = (proceed: (tool: ToolType) => void) => {
    const tool = pendingToolRef.current;
    setConsentTool(null);
    if (!tool) return;
    markConsented(tool);
    track(ANALYTICS_EVENTS.TOOL_CONSENT_ACK, { tool });
    pendingToolRef.current = null;
    proceed(tool);
  };

  /** Tools actually activated this activity; clears the entry. */
  const consumeToolsUsed = (): ToolType[] => {
    if (!currentActivityId) return [];
    const tools = getToolsUsed(currentActivityId);
    clearActivity(currentActivityId);
    return tools;
  };

  const enterFocusMode = () => {
    setFocusMode(true);
    setToolsExpanded(false);
  };

  /** `start` should begin the activity (e.g. the screen's markActivityStart). */
  const handleNudgeTryWithout = (start: () => void) => {
    if (toolNudge) {
      track(ANALYTICS_EVENTS.TOOL_NUDGE_ACTION, {
        tool: toolNudge.tool,
        variant: toolNudge.variant,
        action: "try_without",
      });
    }
    setNudgeHidden(true);
    enterFocusMode();
    start();
  };

  const handleNudgeDismiss = () => {
    if (toolNudge) {
      track(ANALYTICS_EVENTS.TOOL_NUDGE_ACTION, {
        tool: toolNudge.tool,
        variant: toolNudge.variant,
        action: "dismiss",
      });
      void dismissToolNudge(toolNudge.tool).catch(() => {});
    }
    setNudgeHidden(true);
  };

  return {
    // consent
    consentTool,
    requireConsent,
    acknowledgeConsent,
    isMonitoredTool,
    // usage
    markToolActivated,
    consumeToolsUsed,
    // nudge
    toolNudge,
    nudgeVisible,
    handleNudgeTryWithout,
    handleNudgeDismiss,
    // focus mode
    focusMode,
    toolsExpanded,
    setToolsExpanded,
    enterFocusMode,
  };
}
