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
  seen: "eye", // seen / viewed

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
  affirmation: "sun", // an affirmation
  prompt: "message-circle-question-mark", // a shared question/prompt
  challenge: "target", // a shared challenge
  mood: "smile", // mood
  trend: "trending-up", // trend
  trendDown: "trending-down", // trend, downward
  chartPie: "chart-pie", // pie/breakdown chart
  refresh: "refresh-cw", // sync / refresh
  // Growth-profile radar domains (ClinicalStatsWidget)
  confidence: "mic-vocal", // confidence — owning your voice (was "sun", duped `affirmation`)
  // Deliberate shared glyph with `focus`/`challenge` — the surfaces never co-occur,
  // and a bullseye is the honest metaphor for technique mastery (was "check-circle",
  // which read as a verified badge and duped `success`).
  mastery: "target", // mastery / impairment recovery
  ease: "sunset", // ease — calm, settled speech (was "droplet", a Feather outline amid filled Fluent)
  social: "users", // social participation
  // Growth Profile family lenses (DimensionDetail tabs) — collision-free, denotative
  lensCombined: "layer", // combined = stacked baseline + recent signal
  lensClinical: "clipboard-pulse", // clinical = validated questionnaire record
  lensEngagement: "chat", // engagement = recent check-ins
  growthSeed: "sprout", // growth (seedling)
  locked: "lock", // locked achievement
  weekly: "calendar", // "This week" scope
  lifetime: "infinity", // "Lifetime" scope
  globe: "globe", // world / exploration

  // ── Tools · media ──
  play: "play",
  stop: "square",
  volume: "volume-2",
  voiceTool: "mic-vocal", // a voice tool (DAF/Chorus)
  headphones: "headphones",
  focus: "target", // focus mode — practise only your feared sounds

  // ── Settings · profile · premium ──
  email: "mail",
  phone: "smartphone",
  pro: "crown", // premium tier
  unlimited: "infinity", // unlimited (premium)
  ai: "bot", // AI feature
  roadmap: "map", // roadmap / what's next
  checklist: "square-check",

  // ── Global navigation (the floating tab dock) ──
  home: "home",
  explore: "layout-grid",
  community: "users", // the Community tab / "Us" buddy pair
  settings: "settings",
  menu: "menu",
  timeline: "history", // the Timeline view

  // ── Brand marks (Phosphor ships proper brand logos). ──
  socialFacebook: "facebook",
  socialInstagram: "instagram",
  socialWhatsapp: "whatsapp",
} as const satisfies Record<string, IconName>;

export type IconKey = keyof typeof icons;
