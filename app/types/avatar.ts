/**
 * The user-owned avatar (Phase D). Mirrors the backend's `AvatarManifestData`
 * (sw-be-2 `User.avatarManifest`, structurally validated on write) — keep the
 * two in sync by hand.
 *
 * The model in one line: the user CHOOSES the avatar (skin/hair/wardrobe = the
 * IKEA labor), and LEVELING EARNS travel gear — five stage kits telling one
 * story, tourist → guide. Reaching a stage grants its pieces forever; the level
 * itself is the ownership proof, so stage gear needs no server inventory.
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
  /** slot → part id (`slot.name`, e.g. "headgear.tourist") or null = empty. */
  parts: Record<AvatarSlot, string | null>;
  /** #RRGGBB. Stored as hex (not token keys) — skin/hair/backdrop don't flip
   *  with the color scheme, and the server validates the hex shape. */
  colors: { skin: string; hair: string; bg: string };
}

/**
 * What a user who has never opened the studio looks like. The hexes are a data
 * mirror of the assets catalog (assets/avatar/registry.ts) — duplicated here so
 * this module stays dependency-free for the API layer; the D2 art spec is the
 * single source both copy from.
 */
export const DEFAULT_MANIFEST: AvatarManifest = {
  version: 1,
  parts: {
    bg: null, // solid colors.bg in MVP; reserved for patterned tiles
    aura: null, // ALWAYS null — stage identity is worn gear, never a stored aura
    head: "head.classic",
    face: "face.brand", // the one face (one-face rule)
    hair: "hair.swoop",
    beard: null, // clean-shaven by default
    headgear: null,
    eyewear: null,
    collar: null,
    prop: null,
  },
  colors: { skin: "#E8B98A", hair: "#4A362C", bg: "#2E86AB" },
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
 * renderable manifest. Never throws; unknown part ids are KEPT (they render as
 * nothing by design, so a catalog change can't corrupt a stored manifest).
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
    for (const key of ["skin", "hair", "bg"] as const) {
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

export type StageIndex = 0 | 1 | 2 | 3 | 4;

export function stageIndexForLevel(
  level: number,
  stages?: { minLevel: number }[],
): StageIndex {
  const mins =
    stages && stages.length === 5 ? stages.map((s) => s.minLevel) : STAGE_MIN_LEVELS;
  let idx = 0;
  for (let i = 0; i < mins.length; i++) {
    if (level >= mins[i]) idx = i;
  }
  return Math.min(idx, 4) as StageIndex;
}
