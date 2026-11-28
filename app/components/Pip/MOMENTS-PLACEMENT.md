# Pip moments: final animations and placement (founder decisions, 2026-11-28)

Animations: `app/components/Pip/fx/final.ts` (FINAL_MOMENTS: the picked FxEffect(s) per moment, from samples*.ts). Props: fx/props*.ts. Sounds: app/assets/sfx/lab/*.m4a (CC0, CREDITS.json). Lab: MomentsLab (`#momentslab=final` on web; EXPO_PUBLIC_PIP_LAB=final on the phone).

Usage rules: level-up: the 3 take turns. welcome: mat and HELLO letters both kept (by context). waiting-empty: sand timer mostly; goldfish/snail on empty lists. Each moment shows with its words where it needs them.

| # | Moment | Where (trigger) | Placement, background, text (option A, approved) |
|---|---|---|---|
| P1 | Quiz: correct answer | Program > Quiz > Answer sheet | On the sheet edge, no dim. Pip peeks over the answer sheet (as today). Text: the sheet's own "Correct". |
| P2 | Quiz: not this one | Program > Quiz > Answer sheet | On the sheet edge, no dim. As today. Text: the sheet's own "Not this one". |
| P3 | Step done (Next) | Program > Any step > Next | In Pip's hero spot, on Next. Plays as Next is tapped, then the next step slides in. No dim, no new text. |
| P4 | Day start / back to a half-done day | Program > Day > Start step | In the hero on the start step. Replaces today's wave. Text: the day title. |
| P5 | Reflection saved | Program > Your notes > Save | In Pip's spot as Save lands, no dim. The jar plays on the notes screen. Add a short line under Save. New text: "Saved to your notes." |
| P6 | Step skipped | Program > Practice step > Skip > why sheet closes | On the practice screen, right after the sheet closes. No dim. No new text: the sheet already says "No problem". |
| P7 | Day done | Program > Day done screen | On the Day done screen, rays in the orange area only. Replaces today's star burst. Text stays "Day N done". |
| P8 | Next day not open yet | Program > Day locked screen | Add Pip to the locked screen, above its title. The calendar plays when it opens. Text stays "Day N opens in ...". |
| P9 | Further than ever before | Program > Day done (not in the app yet) | Right after Day done, same screen, orange area only. Golden shower. Only when this is the furthest day the user has reached. New text: "Further than ever before." |
| P10 | Program finished | Programs > Goals report | Over the dimmed screen, centred (as set up today). Text stays "That is the program done" / "Your goals stay with you. Nothing here disappears." |
| P11 | Practice done | Practice > Done page | On the done page, Pip on his blob above the headline. No dim. Text: the done headline. |
| P12 | Practice ended early | Practice > Done page (left early) | On the same done page, calm. No dim. Text stays "That's okay." |
| P13 | First AI call done | First call > Aftercare | Over the dimmed screen (as set up today). Text stays "Your first call is done" / "Next, a moment to note how it felt." |
| P14 | Level up / new stage | Practice > Done page | Level: on the done page. New stage: over the dimmed screen. The 3 take turns. New stage text stays "New stage" / "You reached the next stage of your practice." |
| P15 | Recording problem | Practice > Recorder > Mic failed | After OK, on the recorder screen, no dim. Plugs click back in. Add a short line. New text: "Let's try the mic again." |
| P16 | Home greeting / back after days away | Home > Top | Beside the greeting, Pip on his blob, once per app open. No dim. Text: "Good morning, Name" (as today). |
| P17 | Mood check-in | Mood check > after the success sheet closes | On the screen, no dim (as set up today). Text stays "Mood recorded" / "Your check-in is saved." |
| P18 | Welcome, first launch | Onboarding > Welcome | As the welcome screen's hero, no dim. Welcome mat; HELLO letters as the second one. Text stays "Welcome to Speechworks" / "A few questions first, then your first day." |
| P19 | Onboarding done: "You're all set!" | Onboarding > Done | Over the dimmed screen (as set up today). Rocket. Text stays "You're all set!" / "Your first day is ready when you are." |
| P20 | Paired with a practice buddy | Community > after the welcome sheet closes | On the screen, no dim (as set up today). Text stays "You're paired" / "You and your buddy can now see each other's posts." |
| P21 | Purchase done: "You're in" | Program page > after purchase | Over the dimmed screen (as set up today). Text stays "You're in" / "Your program is unlocked. You can start now." |
| P22 | Error / offline: "your work is safe" | Any save > Error sheet | Inside the error sheet, Pip and the computer on top. The title leads with the good news. Text change: "We could not save that yet" -> "Your work is safe" |
| P23 | Waiting / loading / empty list | Loading screens and empty lists | Sand timer replaces the spinner; goldfish or snail on empty lists. Each with the screen's own text ("Loading ..." or the list's empty line). |
| P24 | Notification permission | New: before the phone's own dialog | New in-app ask with the polite bell. Buttons "Allow" / "Not now". After Not now the bell dozes: "No problem. You can turn reminders on in Settings." New text: "Can we remind you to practice?" |

Trigger points (file:line) and existing placement modes (PipMoment dim/none, PipPeek, PipOnEdge, DayFrame): see the map in the session notes; key ones: QuizRunner.tsx:311, PackModule/index.tsx:1265 (Next), :1049 (form saved), :203 (skip), :1252 (day done), :697 (day locked), GoalsReport:80, DonePractice:108/58, FirstCall:128, LevelUpTakeover:87, SmartRecorder:185, Home:286, MoodCheck FollowUp:211, OnboardingWelcome:66, OnboardingDone:84, Community:283, ProgramDetail:515, bottomSheet.ts:13 (error), PackModule:1375 (loading), notifications.ts:483 (permission).

New things needed: an in-app notification ask before the OS dialog (P24); "furthest day reached" tracking (P9); recording-problem plays after the mic dialog OK (P15).
