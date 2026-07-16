/* One-off: make each practice icon's circular housing themeable.
 * ChatGPT baked the housing as the CATEGORY color — which is also the card
 * color, so the halo vanished into the card. Swapping that fill to
 * `currentColor` lets <PracticeIcon housing=...> drive a contrasting halo.
 * The clipPath's <circle> has no fill attribute, so it is untouched. */
const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "..", "app", "assets", "practice-icons");
const HOUSING = /(<circle cx="24" cy="24" r="24" fill=")#[0-9A-Fa-f]{6}(")/;

let changed = 0;
for (const sub of ["categories", "items"]) {
  const dir = path.join(base, sub);
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".svg"))) {
    const p = path.join(dir, file);
    const src = fs.readFileSync(p, "utf8");
    if (!HOUSING.test(src)) {
      console.warn("!! no housing circle matched in", file);
      continue;
    }
    fs.writeFileSync(p, src.replace(HOUSING, "$1currentColor$2"));
    changed++;
  }
}
console.log(`housing → currentColor in ${changed} icons`);
