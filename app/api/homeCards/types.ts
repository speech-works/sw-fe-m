/**
 * The Home priority card contract.
 *
 * Mirrored BY HAND from the server's `HomePriorityCardResult`
 * (sw-be-2/src/services/homePriorityCard.service.ts). The repo already does this
 * for the pack recommender (app/api/packs/types.ts), because tsoa's generated
 * spec is only wired into the admin console, not this app.
 */

/**
 * Why the slot is empty. Every one of these renders the Level card, so the app
 * never branches on which — they exist so the server can say WHY in analytics
 * and in the console's per-user preview.
 *
 * A bare null used to be enough here and was not: on the pack recommender it
 * meant the app congratulated people who had done nothing.
 */
export type HomePriorityCardState =
  | "SHOWING"
  | "NO_CARDS_CONFIGURED"
  | "NO_AUDIENCE_MATCH"
  | "ALL_RETIRED"
  | "GAP";

export interface HomePriorityCardAction {
  /** Stable key, so a handler can switch on it without matching on the label. */
  id: string;
  label: string;
  intent: string;
  intentParams?: Record<string, string | number | boolean> | null;
}

export interface HomePriorityCard {
  key: string;
  cardType: string;
  /** The ALL-CAPS eyebrow. */
  label: string;
  /** The hero line. One rendered line, never wrapped. */
  line1: string;
  line2: string | null;
  /**
   * An icon REGISTRY key, not a glyph name, and not to be trusted. Resolve it
   * through `safeIcon` before rendering: `Icon` falls through to Feather on an
   * unknown name and Feather renders a blank box silently in production.
   */
  icon: string | null;
  intent: string;
  intentParams?: Record<string, string | number | boolean> | null;
  /**
   * 0 or 1 entries means the card navigates straight to `intent`.
   * 2 or 3 means it opens the chooser modal.
   */
  actions: HomePriorityCardAction[];
  modalTitle: string | null;
  modalBody: string | null;
  /**
   * Does the sheet offer a permanent refusal, and in what words.
   *
   * `skipLabel` null means the app's own default. The console can turn the
   * refusal off entirely for a card where "never show me this" is not a
   * sensible thing to offer.
   */
  skipEnabled: boolean;
  skipLabel: string | null;
  /**
   * Design-system accent KEY chosen in the console, never a hex. Resolved by
   * `resolveAccent` into the fill / ink / text / edge the scheme needs.
   */
  accent: string;
  /**
   * Has this user opened this card before. Drives "grow on the first tap only".
   *
   * Treat as "probably". A cold start inside the same moment as an in-flight ack
   * can still read false, so this may cost one extra animation. Nothing
   * functional may gate on it.
   */
  opened: boolean;
}

/**
 * Just enough of a queued card to draw it as a page in the folder. Copy only.
 * There is no key and no intent here ON PURPOSE: a page must be unopenable, or
 * a queued card could be reached out of turn.
 */
export interface NextCardPreview {
  label: string;
  line1: string;
  /**
   * TEACH | NUDGE | INVITE | OFFER. Metadata only — it no longer drives colour.
   * The page's fill comes from `accent`, which the console sets per card, so two
   * TEACH cards can deliberately look different.
   */
  cardType: string;
  /** Design-system accent KEY. See PriorityCard/accent.ts. */
  accent: string;
}

export interface HomePriorityCardResponse {
  state: HomePriorityCardState;
  card: HomePriorityCard | null;
  /**
   * The cards queued behind this one, cheapest priority first, capped server
   * side. Empty means a plain card; anything in it turns the slot into a folder.
   * The first entry is drawn with its copy, the rest as coloured pages.
   */
  queued: NextCardPreview[];
  /**
   * How many OTHER cards this user also matches, capped server-side. Not a
   * total, and NOT read by this app: `queued.length` is the same number and is
   * the one the folder is drawn from. It stays on the wire for the console.
   */
  queuedBehind: number;
}
