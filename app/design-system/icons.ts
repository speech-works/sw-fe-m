import type { IconName } from "./components/Icon";

/**
 * The icon registry — the single source of truth for "which icon means what".
 *
 * The DS icon set is **Lucide** (the SVG successor of Feather; see `Icon`/`IconName`).
 * Reference these SEMANTIC keys (`icons.win`) instead of hardcoding a glyph name
 * in a screen, so that:
 *   1. a concept always renders the SAME icon everywhere, and
 *   2. no single glyph is overloaded to mean two different things.
 *
 * Rules of the road:
 *   - Need an icon for a concept? Add a key HERE first, then reference it.
 *   - One concept → one key → one glyph. Don't add a second key for the same idea.
 *   - Don't reuse a glyph for an unrelated concept — pick a distinct one.
 *   - `satisfies Record<string, IconName>` keeps every value a real Feather glyph.
 */
export const icons = {
  star: 'star',
  // ── Shared moments · wins ──
  win: "award", // a win / accomplishment
  courage: "shield", // faced a fear / bravery
  spokeUp: "mic", // spoke up / used your voice
  proud: "star", // proud of a moment

  // ── Shared moments · struggles (escalating: rain → wind → storm; anchor = weight) ──
  toughDay: "cloud-rain", // a hard day
  anxious: "wind", // anxious / unsettled
  struggling: "cloud-lightning", // really struggling (most intense)
  heavy: "anchor", // everything feels heavy / weighed down
  struggleTab: "cloud", // the "Struggles" category/tab

  // ── UI / navigation ──
  chevronRight: "chevron-right",
  chevronUp: "chevron-up",
  chevronDown: "chevron-down",
  close: "x",
  add: "plus",
  back: "arrow-left", // "go back" / previous
  forward: "arrow-right", // "go to" / next
  leave: "log-out", // leave / unpair
  copy: "copy",
  send: "send",
  launch: "rocket", // open / launch a feature
  soon: "hourglass", // "coming soon"
  success: "circle-check", // confirmed / done
  warning: "circle-alert", // caution / error state
  danger: "triangle-alert", // severe warning
  // Deliberately NOT "flag", even though that is the universal report glyph:
  // `challenge` already owns it, and the registry rule is one glyph per concept.
  report: "alert-octagon", // report content or a person (moderation)
  trash: "trash-2", // delete something of your own
  seen: "eye", // seen / viewed
  info: "info", // contextual explanation / learn more
  /**
   * The rest of the actions, behind one control.
   *
   * Added because `report` was being rendered directly on every discovery
   * card, and an alert glyph sitting at the top right of a PERSON reads as
   * "this one is flagged" — in the exact slot the eye scans for status. Report
   * is a rare, heavy action; it belongs behind this, not beside someone's name.
   */
  more: "more-horizontal", // overflow: the actions that don't earn a place on the surface

  // ── Community · buddy · support ──
  share: "share-2",
  addPerson: "user-plus", // invite / add a buddy
  gift: "gift", // referral / reward
  pairing: "handshake", // pairing / connect
  bond: "heart-handshake", // the buddy bond
  daysTogether: "calendar-heart", // days paired
  energy: "zap", // streak energy / momentum
  streak: "flame", // day streak
  stats: "chart-column", // stats / metrics
  support: "life-buoy", // get support / lifeline
  care: "hand-helping", // reach out / care
  call: "phone-call", // call a hotline
  listen: "ear", // listen
  heart: "heart",
  professionalHelp: "stethoscope", // professional / clinical help
  celebrate: "party-popper", // celebration (replaces 🎉)

  // ── Academy · progress · gamification ──
  journey: "layers", // a pack/journey
  journeyRoute: "route", // journey path
  duration: "clock", // time spent
  timeOfDay: "sunset", // time of day
  xp: "sparkles", // XP earned
  levelUp: "arrow-up", // leveled up
  growth: "circle-arrow-up", // growth delta
  rank: "medal", // level stage / rank
  milestone: "trophy", // milestone reached
  tip: "lightbulb", // a tip
  reminder: "bell", // set/schedule a practice reminder
  oneTime: "calendar", // a single, one-off scheduled reminder
  routine: "arrow-repeat-all", // a repeating routine (distinct from a refresh action)
  affirmation: "message-square", // an affirmation
  prompt: "message-circle-question-mark", // a shared question/prompt
  challenge: "flag", // a shared challenge
  mood: "smile", // mood
  trend: "arrow-trending", // trend
  trendDown: "arrow-trending-down", // trend, downward
  chartPie: "chart-pie", // pie/breakdown chart
  refresh: "arrow-sync", // sync / refresh
  // FOUR KEYS WERE REMOVED HERE — confidence, mastery, ease, social.
  //
  // They were the five-domain clinical radar's icons, and the radar went in
  // `baa856f7`. Their last consumer was BreakthroughModal, now also gone. A
  // registry key with no consumer is not inert: it is a standing invitation to
  // reach for the retired vocabulary, and `ease` is the specific word this
  // product must never put on a screen — in a stuttering app "ease" is read as
  // *my speech got easier*, which is the claim we cannot make and the reason
  // Steadier was renamed Finisher.
  //
  // The fifth, `courage`, survives: it is Braver's icon on the completion
  // screen and the growth card, and "Faced a fear" in the moment picker. Same
  // meaning in all three, which is reuse working as intended rather than a
  // collision.
  growthSeed: "sprout", // growth (seedling)
  locked: "lock", // locked achievement
  weekly: "calendar", // "This week" scope
  lifetime: "infinity", // "Lifetime" scope
  globe: "globe", // world / exploration

  // ── Tools · media ──
  play: "play",
  stop: "square",
  volume: "volume-2",
  mute: "speaker-off",

  // ── Avatar Studio · slot tabs ──
  // Chosen from glyphs NOT claimed by another concept (eye/sparkles/smile/crown
  // are seen/xp/mood/pro). All eight resolve to a real filled glyph — beard and
  // hat are hand-authored (see CUSTOM in fluentPaths.ts); the rest are Fluent.
  avatarSkin: "drop", // skin tone swatches
  avatarFace: "emoji-meh", // expression (eyes + mouth combos of the one brand face)
  avatarHair: "cut", // hair style + color
  avatarBeard: "beard", // facial hair — hand-authored glyph (Fluent ships none)
  avatarHeadgear: "hat", // headgear — hand-authored fedora (Fluent ships none)
  avatarEyewear: "glasses", // eyewear — real Fluent glasses-24-filled
  avatarCollar: "award", // collar / neck apparel — a medal-and-ribbon reads as "worn at the neck"
  avatarProp: "backpack", // the gear the avatar carries (mic/book/camera/compass/lantern/flag)
  avatarBackdrop: "image", // backdrop color
  voiceTool: "mic-vocal", // a voice tool (DAF/Chorus)
  headphones: "headphones",
  focus: "target", // focus mode — zero in on your feared sounds

  // ── Settings · profile · premium ──
  email: "mail",
  phone: "smartphone",
  appearance: "contrast", // the Appearance preference (theme) — half-circle auto glyph
  appearanceLight: "brightness", // Light option card
  appearanceDark: "moon", // Dark option card
  pro: "crown", // premium tier
  unlimited: "infinity", // unlimited (premium)
  ai: "bot", // AI feature
  roadmap: "map", // roadmap / what's next
  checklist: "square-check",
  keepsakeCard: "bookmark", // a kept card (Reach's "Cards" tab) — something written down and held onto

  // ── Media transport + editing (was FontAwesome5 / Ionicons in 25 files) ──
  pause: "pause", // pause playback
  rewind: "rewind", // skip backwards
  skipBack: "rotate-ccw", // jump back N seconds (double-tap scrub)
  skipForward: "rotate-cw", // jump forward N seconds
  expand: "maximize", // enter full screen
  collapse: "minimize", // leave full screen
  fastForward: "fast-forward", // skip forwards
  edit: "edit-3", // edit a saved answer/reflection
  retry: "refresh-cw", // try that again
  chevronLeft: "chevron-left", // back, in a horizontal pager
  chat: "message-circle", // a conversation / prompt bubble
  person: "user", // a person, generically
  waiting: "hourglass", // someone is waiting on you
  align: "crop", // align your face in the frame (MirrorWork calibration)
  roleplay: "person-star", // a roleplay / playing a character

  // ── Global navigation (the floating tab dock) ──
  home: "home",
  explore: "layout-grid",
  community: "users", // the Community tab / "Us" buddy pair
  find: "search", // looking for something/someone — buddy discovery, filters
  settings: "settings",
  menu: "menu",
  timeline: "history", // the Timeline view

  // ── Brand marks (Phosphor ships proper brand logos). ──
  socialFacebook: "facebook",
  socialInstagram: "instagram",
  socialWhatsapp: "whatsapp",
} as const satisfies Record<string, IconName>;

export type IconKey = keyof typeof icons;
