import fs from "fs";
import path from "path";
import { PART_REGISTRY } from "../registry";
import type { AvatarSlot } from "../../../types/avatar";

/**
 * Every part the registry can draw must be offered in the Studio.
 *
 * The Studio lists its ids as hand-written literals, one array per slot. That
 * duplication is invisible to the compiler and to the linter: adding a part to
 * the registry and forgetting the screen leaves a part that exists, renders,
 * has a name — and that nobody can ever select. It happened: 32 parts were
 * added and the hair, expression and prop arrays silently kept their old five.
 *
 * Reading the screen as TEXT is deliberate. Importing it would drag in the
 * whole React Native component tree for a check that is really about two lists
 * agreeing, and a brittle-but-honest string check is worth more here than an
 * elegant one nobody can run.
 */
const SCREEN = path.join(__dirname, "../../../screens/AvatarStudio/index.tsx");

describe("the Studio offers the whole catalog", () => {
  const source = fs.readFileSync(SCREEN, "utf8");

  // `bg` and `aura` have no picker of their own beyond what is asserted below;
  // `head` is the single fixed base part.
  const SLOTS: AvatarSlot[] = ["face", "hair", "beard", "headgear", "eyewear", "collar", "prop", "bg"];

  SLOTS.forEach((slot) => {
    it(`offers every ${slot}`, () => {
      const missing = Object.keys(PART_REGISTRY[slot]).filter(
        (id) => !source.includes(`"${id}"`),
      );
      expect(missing).toEqual([]);
    });
  });
});
