# Backend contract — Avatar & Rewards (unblocks FE Phases 4–5)

**From:** Frontend (one-track unification program) · **Date:** 2026-07-16
**Status:** FE is built/specced up to these three contracts; nothing below is live until BE ships it.

The product context in one line: practice → your character grows. XP already
exists server-side and stays untouched; these contracts add (A.1) an optional
enrichment to completion responses, (A.2) storage for a user-owned avatar, and
(A.3) reward grants + collections.

**Product guardrails baked into these contracts (please don't relax them):**
- **Nothing earned ever decays or expires** — no lapse penalties of any kind.
- **Cosmetics never gate therapy content** — grants/collections are additive only.
- **Effort-not-fluency** — grants trigger on completions/level-ups/milestones,
  never on scores or fluency-like measures.

---

## A.1 — `progression` on completion responses (OPTIONAL, nice-to-have)

FE currently detects level-ups client-side by diffing `/users/me` before/after
completion (works, costs one extra GET + a retry when XP is applied async).
Adding an authoritative field removes that dance.

Extend the responses of:
- `POST /practice-activities/{id}/complete`
- `POST /practice-activities/{id}/complete-mirror-work`

with an **additive** field (everything existing stays unchanged):

```jsonc
{
  // ...existing PracticeActivity payload...
  "progression": {
    "xpEarned": 12,
    "totalXp": 354,
    "leveledUp": true,
    "newLevel": 8,
    "levelStage": { "title": "Pathfinder", "fullTitle": "Pathfinder II" }
  }
}
```

FE adoption is already seamed (celebration store gains `applyServerResult()`);
no coordination needed beyond shipping the field.

## A.2 — `User.avatarManifest` (REQUIRED for Phase 4: Avatar)

A nullable JSON field on the user, returned by `GET /users/me` and accepted by
`PATCH /users/me` (FE's `updateMyUser` sends `Partial<User>`, so it flows
through as soon as the field exists):

```jsonc
{
  "version": 1,
  "parts": {
    "bg": "bg.sunrise",
    "aura": null,
    "head": "head.classic",
    "face": "face.smile",
    "hair": "hair.curl",
    "headgear": null,
    "eyewear": null,
    "prop": null
  },
  "colors": { "skin": "#E8B98A", "hair": "#3B2E2A", "bg": "#2E86AB" }
}
```

Server responsibilities:
- **MVP — validate the manifest STRUCTURALLY only** (SHIPPED): `version === 1`,
  `parts` values `string(1..64) | null` (≤16 entries), `colors` as `#RRGGBB`
  (≤8 entries), ≤4 KB total → `400` on shape violations. The part catalog is
  FE-owned; unknown IDs are stored verbatim and render as nothing. Catalog /
  ownership validation arrives with A.3 grants (Phase E).
- **Never strip ownership**: if a user equips a part they own, it must persist;
  removing catalog items must not corrupt stored manifests (FE renders unknown
  IDs as nothing, by design).

## A.3 — Grants & collections (REQUIRED for Phase 5: Rewards)

Grants are "pick 1 of 3" reward choices emitted by the server **exactly once**
per trigger (level-up, per-category milestone). They never expire.

### `GET /users/me/grants/pending`

```jsonc
{
  "grants": [
    {
      "id": "grant_abc123",
      "trigger": "LEVEL_UP",                    // or "MILESTONE"
      "triggerMeta": { "level": 8 },            // or { "category": "READING_PRACTICE", "milestone": 25 }
      "options": [                               // EXACTLY 3
        {
          "optionId": "opt_1",
          "kind": "avatar_part",                 // or "collection_item"
          "partSlot": "headgear",
          "partId": "headgear.beret",
          "collectionTheme": null,
          "itemId": null,
          "title": "Cozy Beret",
          "previewKey": "headgear.beret"
        }
        // ... 2 more
      ],
      "expiresAt": null                          // ALWAYS null — grants never expire
    }
  ]
}
```

### `POST /users/me/grants/{grantId}/choose`

Body `{ "optionId": "opt_1" }` → `{ "granted": { ...option... }, "inventory": [ ...all owned... ] }`

- **Idempotent**: re-choosing (any option) on an already-resolved grant returns
  the original result with `200`, never a double-grant and never an error that
  loses the reward.

### `GET /users/me/collections`

```jsonc
{
  "themes": [
    {
      "key": "reading",
      "title": "The Reader's Shelf",
      "category": "READING_PRACTICE",
      "ownedCount": 3,
      "totalCount": 8,
      "items": [
        { "itemId": "reading.bookmark", "title": "Silk Bookmark", "owned": true, "source": "grant_abc123" }
      ]
    }
  ]
}
```

### Emission rules

- On **level-up**: one grant per level gained, emitted exactly once (idempotent
  under retries of the completion call).
- On **category milestones** (thresholds TBD with FE — e.g. 5/25/100 completions
  per `PracticeActivityContentType`): one grant per crossed threshold.
- Pending grants accumulate; FE surfaces them after the level-up takeover and
  re-surfaces any unclaimed ones on Home — so "unclaimed" must be queryable
  forever (no TTL).

---

## Sequencing

A.2 unblocks the avatar studio (FE Phase 4). A.3 unblocks rewards (FE Phase 5)
— it also depends on the avatar existing, so **A.2 first**. A.1 is independent
and can ship any time.
