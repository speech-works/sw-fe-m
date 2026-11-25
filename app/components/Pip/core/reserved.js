/**
 * ── RESERVED PARTS: PIP IS NOT A LOOK USERS CAN MAKE ─────────────────────────
 * Pip, the Speechworks mascot, has parts of his own (kit/catalog-pip.json, flag
 * `reserved: "pip"`). They never go into kit/catalog-app.json, the catalog an
 * avatar editor lists, so no user can pick them (founder, 2026-11-25).
 *
 * - `withReserved(cat, res)` gives Pip's renderer a catalog that has both.
 * - `userCatalog(cat)` is what an editor must list: it drops any reserved part,
 *   even if someone merged the two catalogs by mistake.
 *
 * core/scripts/check-pip.mjs is the gate: it fails if a reserved part reaches
 * catalog-app.json, or if the user palettes gain Pip's colours (a near-black
 * jacket or an orange tie), which is what would let users rebuild him from
 * shared parts.
 */
                              
                                                             
                       
 

export const isReserved = (part                                                 )          =>
  !!(part && part.flags && part.flags.reserved);

export function withReserved                       (cat   , res                                 )    {
  return { ...cat, parts: { ...cat.parts, ...res.parts } };
}

export function userCatalog                       (cat   )    {
  const parts                       = {};
  for (const [id, p] of Object.entries(cat.parts)) if (!isReserved(p)) parts[id] = p;
  return { ...cat, parts };
}
