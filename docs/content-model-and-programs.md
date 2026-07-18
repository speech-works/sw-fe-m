# Content Model & Paid Programs — design

**Status:** draft for review · **Decided:** commercial policy C (below) · **Author:** Claude, 2026-07-19
**Trigger:** a user tapped Reframe in Explore and was told "Out of Energy" with 67/100 stamina.

---

## 1. What happened, and what it exposed

Starting Reframe from Explore failed. The chain:

1. `Transform Negative Thoughts` (the only `REFRAMING_THOUGHTS` row in the catalog) sits inside the paid **Interview Ready** pack.
2. `PracticeActivityService.create` gates on what the **content** belongs to, not on what the request declares — deliberately, so paid content can't be run via a plain session. It threw `PackNotOwnedError` → HTTP 402.
3. The Reframe screen treated *any* 402 as out-of-stamina. Fixed in `a6a21fa`; that clause could never have been right, since `InsufficientStaminaError` maps to 400 and 402 is exclusively the purchase errors.
4. Hiding paid content from the listing (`ecdc39a`) then removed the **entire Reframe category**, because that one row was the only one. Reverted in `4b09438`.

The bug is not the gate. The gate is correct. The bug is that **one row is trying to be two things**:

| | |
|---|---|
| **Library item** | browsable in Explore, standalone, free |
| **Curriculum step** | sequenced inside a program, possibly paid |

Nothing in the schema distinguishes them. "Is this paid?" is *inferred* at runtime by joining `module_content_blocks → pack_modules → packs WHERE catalogKey IS NOT NULL`. A row therefore changes status silently the moment anyone drops it into a paid pack's module — no authoring decision, no review, no way to see it coming. The library loses an item and nobody is told.

### Current catalog (measured 2026-07-19)

| Cognitive type | Total rows | Inside the paid pack | Free |
|---|---|---|---|
| REFRAMING_THOUGHTS | **1** | **1** | **0** |
| GUIDED_MEDITATION | 7 | 1 | 6 |
| GUIDED_BREATHING | 4 | 0 | 4 |
| REAL_LIFE_CHALLENGE | 6 | 0 | 6 |
| MIRROR_WORK | 1 | 0 | 1 |

22 packs exist; **one** is paid (`interview_ready`, 12 activity blocks: 2 cognitive + 8 exposure). The other 21 are free curated journeys. So the blast radius today is small — but Reframe proves a single seeding choice can silently delete a therapy technique from the app.

---

## 2. Commercial policy (DECIDED)

> **Sell the arc, never the technique.**
> Every therapeutic technique has a free, standalone representative in the library. Paid programs sell sequencing, personalization, context, the day-gated progression, and the narrative — never access to a technique.

Why this and not "programs may own exclusive exercises":

- **It's already a locked principle of this program.** "Cosmetics never gate therapy." Reframe is CBT cognitive restructuring — it *is* therapy. Paywalling it happened by accident, not by decision, and it violates a rule we'd already written down.
- **It protects the positioning.** The differentiator is clinical honesty — no fluency metric, OASES-grounded, effort-not-fluency. "The thought-reframing exercise costs ₹X" is not defensible next to that, and it's the kind of detail that gets quoted back at you.
- **It removes a whole class of bug.** If no technique is ever paid-only, the "hide paid content" filter can never empty a category. The invariant does the work that runtime inference can't.

### The rule, precisely

1. Every `type` (technique) MUST have ≥1 `LIBRARY`-visible row. Enforced by a check, not by hope — see §4.
2. A program MAY include library content (referenced) **and** its own exclusive content (contextualized).
3. Program-exclusive content MUST NOT be the only instance of its technique.

---

## 3. Content model

Add explicit visibility to content. Stop inferring.

```ts
export enum ContentVisibility {
  /** Browsable standalone in Explore. Never gated. */
  LIBRARY = "LIBRARY",
  /** Exists only inside its program. Never listed in Explore. */
  PROGRAM_EXCLUSIVE = "PROGRAM_EXCLUSIVE",
}
```

Applied to each content table that packs can reference (`cognitive_practice`, `exposure_practice`, `reading_practice`), defaulting to `LIBRARY` so existing rows keep their behaviour.

**What each listing does then:**

- Explore listings filter `visibility = LIBRARY`. Flat, explicit, one indexed column — no join, no inference, nothing that can change under you.
- Program module rendering ignores visibility entirely; a program shows whatever its modules reference.
- The create-time gate (`resolveOwningPaidPack` → `assertOwned`) **stays exactly as it is.** It is the security boundary and it is correct: it prevents running paid content by id through a plain session. Visibility is a *listing* concern; ownership is an *access* concern. Keeping them separate is the point.

**Why not just duplicate rows into programs (model B):** it also works and removes gating from library content entirely, but doubles the authoring surface and lets the two copies drift. Revisit only if program-specific framing turns out to need heavy per-program rewrites.

---

## 4. The invariant needs a guard, not a comment

The whole failure mode was "someone moved content and nobody noticed." A comment would not have prevented it. Add a check that fails loudly:

```
npm run content:check
```

- For each technique type, assert ≥1 `LIBRARY` row exists.
- Assert no `PROGRAM_EXCLUSIVE` row is the sole instance of its type.
- Run it in CI and after seeding. Precedent: `npm run icons:check`, added for exactly this class of silent drift.

Without this, §2's rule is an aspiration.

---

## 5. Immediate content work

`REFRAMING_THOUGHTS` has no free instance. Under policy C that must change before any listing filter is reinstated:

- **Author a free standalone Reframe** for the library — the generic technique: catch the thought, name the distortion, reframe it.
- Interview Ready keeps `Transform Negative Thoughts` as `PROGRAM_EXCLUSIVE`, framed for its arc ("the interview thought that's been circling").

That single addition is what makes the filter safe to re-enable, and it's content work, not code.

Also worth auditing: `REAL_LIFE_CHALLENGE` (6 free today) and the exposure catalog — Interview Ready holds 8 exposure blocks, so check none of those scenarios is the only instance of something.

---

## 6. Explore ↔ Programs: flow and positioning

### Today

`Explore → ProgramsEntryCard → Programs` — a single hardcoded Interview Ready page with an INR price and an owned state. The 21 free packs surface elsewhere as journeys. Paid programs are effectively one product behind one card.

### Principles

1. **No dead ends.** A user must never reach a start button for something they can't start. Either it's startable, or it's visibly a program with a route in.
2. **Never interrupt therapy to sell.** No upsell inside a practice flow, on a completion screen, or in a moment of struggle. Offer after a *successful* related session, or in browse context.
3. **Locked ≠ hidden.** Hiding paid content kills discovery (and caused this bug). A locked *preview* card that routes into the program is better than absence — but only once every technique has a free instance, or the card is honest that a free version exists.

### Proposed surfaces

| Surface | Purpose | Notes |
|---|---|---|
| **Programs hub** | Browse all programs, free and paid together | Today it's one product page. Free journeys and paid programs should live in one place with a clear ownership state, not two systems |
| **Program detail** | Curriculum preview before purchase | Show the arc — modules, session count, what changes week to week. Sell the structure, since that IS the product under policy C |
| **Library preview card** | Discovery from Explore | A program-exclusive item may appear as a locked card that routes to its program — never as a start button. Optional; only if it earns its place |
| **Contextual offer** | Post-session, related program | After finishing a free Reframe: "Interview Ready builds on this over 3 weeks." Once, dismissible, never mid-flow |

### Open questions for you

1. **Do free journeys and paid programs share one hub?** They're both "packs" in the data. Presenting them as one shelf with different states is simpler and honest; splitting them makes the paid tier feel like a separate store.
2. **Should program-exclusive content be visible-but-locked in Explore at all?** Cleanest is no — programs are discovered as programs. But it costs discovery.
3. **Is Interview Ready's price a one-off unlock or does more catalog follow?** A one-product store and a 10-program catalog want different navigation.

---

## 7. Sequence

1. ~~Revert the filter~~ — done, `4b09438`.
2. ~~Fix the 402 misclassification~~ — done, `a6a21fa`.
3. **Author the free Reframe** (content) — unblocks everything else.
4. Add `ContentVisibility` + migration, defaulting all existing rows to `LIBRARY`.
5. Mark `Transform Negative Thoughts` (and any other program-exclusive content) as `PROGRAM_EXCLUSIVE`.
6. Add `content:check` and wire it into CI.
7. Re-enable Explore filtering — now on the explicit column, and now safe.
8. Design the Programs hub / detail / contextual offer against §6 once the questions above are answered.

Steps 4–7 are a small, well-bounded backend change. Step 3 is the real prerequisite. Step 8 is where the design work actually lives.
