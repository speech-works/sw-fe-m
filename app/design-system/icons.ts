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
  seen: "eye", // seen / viewed
  info: "info", // contextual explanation / learn more

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
  routine: "refresh-cw", // a repeating/recurring reminder
  affirmation: "message-square", // an affirmation
  prompt: "message-circle-question-mark", // a shared question/prompt
  challenge: "flag", // a shared challenge
  mood: "smile", // mood
  trend: "trending-up", // trend
  trendDown: "trending-down", // trend, downward
  chartPie: "chart-pie", // pie/breakdown chart
  refresh: "refresh-cw", // sync / refresh
  // Growth-profile radar domains (ClinicalStatsWidget)
  confidence: "sun", // confidence — owning your voice
  mastery: "graduation-cap", // mastery / skill level
  ease: "sunset", // ease — calm, settled speech (was "droplet", a Feather outline amid filled Fluent)
  social: "users", // social participation
  // Growth Profile family lenses (DimensionDetail tabs) — collision-free, denotative
  lensCombined: "layer", // combined = stacked baseline + recent signal
  lensClinical: "clipboard-pulse", // clinical = validated questionnaire record
  lensEngagement: "person-star", // engagement = active user (person + star = engaged)
  growthSeed: "sprout", // growth (seedling)
  locked: "lock", // locked achievement
  weekly: "calendar", // "This week" scope
  lifetime: "infinity", // "Lifetime" scope
  globe: "globe", // world / exploration

  // ── Tools · media ──
  play: "play",
  stop: "square",
  volume: "volume-2",
  // No Fluent glyph is mapped for this yet, so it renders via the Feather
  // fallback (as Meditation's hand-rolled toggle already does). Keyed here so
  // mapping it later is one edit, not a hunt for raw glyph names.
  mute: "volume-x",

  // ── Avatar Studio · slot tabs ──
  // Chosen from glyphs NOT claimed by another concept (eye/sparkles/smile/crown
  // are seen/xp/mood/pro). droplet/scissors/compass/feather/map-pin render via
  // the Feather fallback until Fluent glyphs are mapped (same interim as mute).
  avatarSkin: "droplet", // skin tone swatches
  avatarFace: "meh", // expression (eyes + mouth combos of the one brand face)
  avatarHair: "scissors", // hair style + color
  avatarBeard: "user", // facial hair (a face/person glyph; Fluent "beard" when mapped)
  avatarHeadgear: "umbrella", // headgear (closest free overhead-cover glyph; Fluent "hat" when mapped)
  avatarEyewear: "aperture", // eyewear (a lens; Fluent "glasses" when mapped)
  avatarProp: "feather", // held props
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
