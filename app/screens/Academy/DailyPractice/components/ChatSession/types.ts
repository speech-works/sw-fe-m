/** A single chat bubble. `incoming` = the AI/NPC, `outgoing` = the user. */
export interface ChatSessionMessage {
  id: string;
  type: "incoming" | "outgoing";
  text: string;
}

/**
 * A selectable response. Structurally matches both `FixedRolePlayNodeOption`
 * (Interview / Social Challenge) and `RolePlayNodeOption` (Roleplay), so each
 * screen passes its own concrete type with no cast.
 */
export interface ChatSessionOption {
  id: string;
  userLine: string;
  nextNodeId: string | null;
}

export interface ChatSessionProps<O extends ChatSessionOption = ChatSessionOption> {
  /** Header title (scenario / interview / roleplay name). */
  title: string;
  /** Back-bar action — the screen owns the destination (e.g. the MOOD_CHECK branch). */
  onBack: () => void;

  /** The conversation so far, oldest → newest. */
  messages: ChatSessionMessage[];

  /** The current turn's response options (empty when it's not the user's turn). */
  options: O[];

  /**
   * Fires once the user has ARMED an option and confirmed speaking it. The screen
   * appends the outgoing bubble, stores the (local) recording uri via
   * `setVoiceRecordingUri` — overwriting the previous one, so only the LAST take
   * is ever uploaded — and advances to `option.nextNodeId`.
   */
  onAdvance: (option: O, recordingUri: string | null) => void;

  /**
   * Fires when the dialogue has ended and the user taps Finish — runs the
   * screen's existing completion flow (vitals modal / mark-complete).
   */
  onComplete: () => void;

  /**
   * Category accent for the chat's own surfaces (the armed reply card, the "You"
   * bubble ring, technique highlight chips, the recorder). Optional — omit it and
   * everything stays the brand orange (Interview / Social Challenge do this;
   * Roleplay passes its blue category colour).
   */
  accentColor?: string;
  onAccentColor?: string;
}
