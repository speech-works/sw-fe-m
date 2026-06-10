# Community & User Survey Questions

A living backlog of questions we want **our users and community** to answer for us, so we
validate product decisions instead of assuming them. As we brainstorm, when a question comes
up that only a real PWS / therapist / institute can answer, drop it in the matching file.

## Files (segregated by audience)

- [`pws.md`](pws.md) — People Who Stutter (our primary end users / adults)
- [`therapists.md`](therapists.md) — SLPs / fluency specialists (clinical validity + B2B2C channel)
- [`institutes.md`](institutes.md) — clinics, universities, support orgs (e.g. NSA), group/bulk buyers

## Conventions

Each question is one row in the audience file's table:

| Column | Meaning |
|---|---|
| **ID** | Stable id, e.g. `PWS-007`. Never reuse. |
| **Question** | The exact wording we'd put in a survey/interview. |
| **Type** | `multiple-choice` · `scale` (1–5) · `open` · `yes/no` |
| **Informs** | Which feature/decision the answer unblocks (link to a spec where relevant). |
| **Priority** | `P0` blocks a near-term build · `P1` shapes roadmap · `P2` nice-to-know. |
| **Status** | `draft` · `ready` · `fielded` · `answered` |

Guidelines:
- One question = one decision. If it informs two decisions, it's probably two questions.
- Prefer questions whose answer would actually *change what we build*. Skip vanity questions.
- Keep clinical-validity questions in `therapists.md`, not `pws.md`.
- When a question is answered, note the finding inline (or link to where the result lives) and set status `answered`.

> Seeded 2026-06-03 from the "PWS feature suggestions" brainstorm (referral loop, pairing,
> fun-practice games, guided storytelling). See `docs/product/referral-loop-spec.md`.
