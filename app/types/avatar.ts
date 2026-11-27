/**
 * The user-owned avatar. Mirrors the backend's `AvatarManifestData`
 * (sw-be-2 `User.avatarManifest`, structurally validated on write: version 1,
 * at most 16 parts each null or a 1-64 character id, at most 8 colours each a
 * hex) — keep the two in sync by hand.
 *
 * The parts are the layered avatar kit's (the website's kit; see
 * components/KitAvatar). The user chooses every piece; nothing is earned by
 * level (founder, 2026-11-27: travel gear, level rewards, props, auras and
 * patterned backdrops are dropped for now).
 */

export type AvatarSlot =
  | "bg"
  | "aura"
  | "head"
  | "face"
  | "hair"
  | "beard"
  | "headgear"
  | "eyewear"
  | "collar"
  | "prop";

export interface AvatarManifest {
  version: 1;
  /** slot → kit part id (`slot.name`, e.g. "headgear.beanie") or null = empty.
   *  bg, aura and prop have no kit parts and stay null. */
  parts: Record<AvatarSlot, string | null>;
  /** #RRGGBB. Stored as hex (not token keys) — skin/hair/backdrop/collar don't
   *  flip with the color scheme, and the server validates the hex shape. The
   *  server accepts any color keys (≤8, each a valid hex), so `collar` needs no
   *  backend change — it's the recolor for whatever collar is worn. */
  colors: { skin: string; hair: string; bg: string; collar: string } & AvatarExtraColors;
}

/** Colour keys the kit also understands (all optional; the part's own default
 *  colour is used when absent). Kept by normalizeManifest so a later Studio can
 *  offer them without a data change. The server allows at most 8 colours. */
export type AvatarExtraColors = Partial<Record<(typeof EXTRA_COLOR_KEYS)[number], string>>;
export const EXTRA_COLOR_KEYS = ["headgear", "eyewear", "collarAccent", "hairAccent"] as const;   // 4 + 4 = the server's 8

/**
 * What a user who has never opened the studio looks like: the kit's default
 * (head, calm face, crew tee, the kit's default colours) with the swoop hair.
 * Duplicated from the kit catalog (components/KitAvatar/kit/catalog.json) so
 * this module stays dependency-free for the API layer.
 */
export const DEFAULT_MANIFEST: AvatarManifest = {
  version: 1,
  parts: {
    bg: null, // no patterned backdrops: the blob is the flat colors.bg
    aura: null,
    head: "head.classic",
    face: "face.calm",
    hair: "hair.swoop",
    beard: null,
    headgear: null,
    eyewear: null,
    collar: "collar.v4_polo_v4_n", // the website collars (founder, 2026-11-28); old collar ids are kit aliases
    prop: null,
  },
  colors: { skin: "#E8B98A", hair: "#4A362C", bg: "#2E86AB", collar: "#3A5A8C" },
};

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;
const ALL_SLOTS: AvatarSlot[] = [
  "bg",
  "aura",
  "head",
  "face",
  "hair",
  "beard",
  "headgear",
  "eyewear",
  "collar",
  "prop",
];

/**
 * Tolerant read-path repair: ANY input — null (never customized), a partial or
 * future-versioned manifest, a corrupted persisted blob — becomes a complete,
 * renderable manifest. Never throws; unknown part ids are KEPT (the kit
 * renderer draws its default for that slot, so a catalog change can't corrupt a
 * stored manifest or crash a screen).
 */
export function normalizeManifest(input?: unknown): AvatarManifest {
  const out: AvatarManifest = {
    version: 1,
    parts: { ...DEFAULT_MANIFEST.parts },
    colors: { ...DEFAULT_MANIFEST.colors },
  };
  if (typeof input !== "object" || input === null) return out;

  const raw = input as { parts?: unknown; colors?: unknown };

  if (typeof raw.parts === "object" && raw.parts !== null && !Array.isArray(raw.parts)) {
    const parts = raw.parts as Record<string, unknown>;
    for (const slot of ALL_SLOTS) {
      const v = parts[slot];
      if (v === null) out.parts[slot] = null;
      else if (typeof v === "string" && v.length > 0 && v.length <= 64) out.parts[slot] = v;
    }
  }
  if (typeof raw.colors === "object" && raw.colors !== null && !Array.isArray(raw.colors)) {
    const colors = raw.colors as Record<string, unknown>;
    for (const key of ["skin", "hair", "bg", "collar", ...EXTRA_COLOR_KEYS] as const) {
      const v = colors[key];
      if (typeof v === "string" && HEX_RE.test(v)) out.colors[key] = v;
    }
  }
  return out;
}

/**
 * Stage bounds. Prefer the server's `stages[]` (from getLevelStage) when it's
 * in scope — the fallback mirrors the server seed (LevelStages.ts): Seeker 1–5
 * · Pathfinder 6–15 · Voyager 16–30 · Catalyst 31–50 · North Star 51+.
 */
export const STAGE_MIN_LEVELS = [1, 6, 16, 31, 51] as const;
