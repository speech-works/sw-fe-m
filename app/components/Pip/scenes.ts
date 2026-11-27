/**
 * Blob scenes (founder 2026-11-26): while an effect with a scene plays, Pip keeps his own blob shape (his head and shoulders
 * escape it, a free floating look) and the blob takes the scene's colour. No extra scene pieces: still stickers hanging
 * beside him (peaks, tent, bunting, balloons...) looked cheap; the effect's own particles carry the scene.
 */
export type BlobScene = { id: "snow" | "campfire" | "party" | "love"; name: string; blob: string };

export const BLOB_SCENES: Record<BlobScene["id"], BlobScene> = {
  snow: { id: "snow", name: "Snowy mountains", blob: "#8CC6F2" },
  campfire: { id: "campfire", name: "Campfire night", blob: "#7C5CD0" },
  party: { id: "party", name: "Party sky", blob: "#FFC94A" },
  love: { id: "love", name: "Love clouds", blob: "#FF8FB0" },
};
