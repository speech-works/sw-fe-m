# SpeechWorks Analytics Tracking Map

> **Provider:** PostHog (EU Cloud — `eu.posthog.com`)  
> **SDK:** `posthog-react-native`  
> **Service layer:** `app/util/analytics/postHog.ts`  
> **Event catalog:** `app/util/analytics/analyticsEvents.ts`  
> Last updated: 2026-04-27

---

## 1 — Auth

| Screen / Layer | Route | Component | User Action | Event Name | Extra Properties |
|---|---|---|---|---|---|
| User Store (system) | — | `app/stores/user/index.ts` | App loads and fetches authenticated user | `identify()` called (not a `track`) | `isPaid`, `hasOnboarded`, `staminaCap` |
| Auth Context (system) | — | `app/contexts/AuthContext.tsx` | User taps Log Out | `user_logged_out` | — |
| Auth Context (system) | — | `app/contexts/AuthContext.tsx` | Logout completes | `reset()` called (not a `track`) | Clears PostHog identity |

> [!NOTE]
> `USER_SIGNED_UP` and `USER_LOGGED_IN` constants exist in the catalog but are **not yet wired** — add them to the login/signup screen when built.

---

## 2 — Onboarding

| Screen | Route | Component | User Action | Event Name | Extra Properties |
|---|---|---|---|---|---|
| Onboarding Welcome | `OnboardingStack → OnboardingWelcome` | `app/screens/Onboarding/OnboardingWelcome.tsx` | Taps **Start** button | `onboarding_started` | — |
| Onboarding Question | `OnboardingStack → OnboardingQuestion` | `app/screens/Onboarding/OnboardingQuestionScreen.tsx` | Taps **Next** to move to next step | `onboarding_step_viewed` | `step` (number) |
| Onboarding Question | `OnboardingStack → OnboardingQuestion` | `app/screens/Onboarding/OnboardingQuestionScreen.tsx` | Taps **Skip (✕)** | `onboarding_skipped` | `atStep` (number) |
| Onboarding Done | `OnboardingStack → OnboardingDone` | `app/screens/Onboarding/OnboardingDone.tsx` | Taps **Continue** on completion screen | `onboarding_completed` | — |

---

## 3 — Impact Assessment (Clinical Estimation Funnel)

> This is the highest-priority funnel for investor metrics.

| Screen | Route | Component | User Action | Event Name | Extra Properties |
|---|---|---|---|---|---|
| Assessment Intro | `AcademyStack → ImpactAssessmentIntro` | `app/screens/Academy/ImpactAssessment/ImpactAssessmentIntro.tsx` | System navigates user into questions (not already complete) | `assessment_started` | `totalQuestions` |
| Assessment Questions | `AcademyStack → ImpactAssessmentQuestions` | `app/screens/Academy/ImpactAssessment/ImpactAssessmentQuestions.tsx` | Taps **Next** to advance a question | `assessment_step_viewed` | `step`, `totalSteps` |
| Assessment Questions | `AcademyStack → ImpactAssessmentQuestions` | `app/screens/Academy/ImpactAssessment/ImpactAssessmentQuestions.tsx` | Submits final batch and backend confirms `isComplete` | `assessment_completed` | `totalAnswered` |
| Assessment Questions | `AcademyStack → ImpactAssessmentQuestions` | `app/screens/Academy/ImpactAssessment/ImpactAssessmentQuestions.tsx` | Taps **Stop** in pause modal | `assessment_abandoned` | `atStep`, `totalSteps` |

---

## 4 — Practice Sessions (Packs & Activities)

| Screen | Route | Component | User Action | Event Name | Extra Properties |
|---|---|---|---|---|---|
| Pack Module | `ExploreStack → PackModule` | `app/screens/Academy/PackModule/index.tsx` | Module loads successfully (from nav params or API) | `practice_session_started` | `packId`, `moduleId`, `moduleTitle`, `totalBlocks` |
| Pack Module | `ExploreStack → PackModule` | `app/screens/Academy/PackModule/index.tsx` | Taps **Complete** on the last block | `practice_session_ended` | `packId`, `moduleId`, `moduleTitle`, `completedBlocks`, `totalBlocks` |
| Content Renderer | — | `app/components/Pack/ContentRenderer.tsx` | User clicks **Start** on a Pack activity block | `activity_started` | `packId`, `moduleId`, `activityId`, `contentType`, `title` |
| Reflection Form | — | `app/screens/Academy/PackModule/index.tsx` | User completes a reflection form block | `activity_completed` | `packId`, `moduleId`, `blockId`, `type: FORM` |

### 4a — Standalone Reading Practice Flow
Entry path: **Explore → Daily Practice → Reading Practice → Stories / Poems / Quotes**

| Screen | Route | Component | User Action | Event Name | Extra Properties |
|---|---|---|---|---|---|
| Story Practice | `DailyPracticeStack → ReadingPracticeStack → StoryPractice` | `useStoryPractice.ts` | Taps **Start Practice** on tips screen | `activity_started` | `activityId`, `contentType: READING_PRACTICE`, `title`, `isPackContext: false` |
| Story Practice | `DailyPracticeStack → ReadingPracticeStack → StoryPractice` | `useStoryPractice.ts` | Taps **Done** / submits recording | `activity_completed` | `activityId`, `contentType: READING_PRACTICE`, `title`, `isPackContext: false` |
| Poem Practice | `DailyPracticeStack → ReadingPracticeStack → PoemPractice` | `PoemPractice/index.tsx` | Taps **Start Practice** on tips screen | `activity_started` | `activityId`, `contentType: READING_PRACTICE`, `title`, `isPackContext: false` |
| Poem Practice | `DailyPracticeStack → ReadingPracticeStack → PoemPractice` | `PoemPractice/index.tsx` | Taps **Done** / submits recording | `activity_completed` | `activityId`, `contentType: READING_PRACTICE`, `title`, `isPackContext: false` |
| Quote Practice | `DailyPracticeStack → ReadingPracticeStack → QuotePractice` | `useQuotePractice.ts` | Taps **Start Practice** on tips screen | `activity_started` | `activityId`, `contentType: READING_PRACTICE`, `title`, `isPackContext: false` |
| Quote Practice | `DailyPracticeStack → ReadingPracticeStack → QuotePractice` | `useQuotePractice.ts` | Taps **Done** / submits recording | `activity_completed` | `activityId`, `contentType: READING_PRACTICE`, `title`, `isPackContext: false` |

### 4b — Standalone Cognitive Practice Flow

| Screen | Route | Component | User Action | Event Name | Extra Properties |
|---|---|---|---|---|---|
| Meditation | `CognitivePracticeStack → MeditationPractice` | `Meditation/index.tsx` | Taps **Start Exercise** | `activity_started` | `activityId`, `contentType: COGNITIVE_PRACTICE`, `title`, `isPackContext: false` |
| Meditation | `CognitivePracticeStack → MeditationPractice` | `Meditation/index.tsx` | Completes 5-min session and submits vitals | `activity_completed` | `activityId`, `contentType`, `title`, `vitals: { effortScore, autonomyScore }` |
| Meditation | `CognitivePracticeStack → MeditationPractice` | `Meditation/index.tsx` | Taps **End Session** early | `activity_abandoned` | `activityId`, `contentType`, `progressSeconds` |

---

## 5 — Payments (Paywall Funnel)

| Screen | Route | Component | User Action | Event Name | Extra Properties |
|---|---|---|---|---|---|
| Payments | `RootStack → Payments` | `app/screens/Payments/index.tsx` | Screen mounts (any navigation to paywall) | `paywall_viewed` | — |
| Payments | `RootStack → Payments` | `app/screens/Payments/index.tsx` | Taps **Subscribe** (Razorpay sheet opens) | `payment_started` | `planId` (`annual`/`monthly`), `amountInr` |
| Payments | `RootStack → Payments` | `app/screens/Payments/index.tsx` | Razorpay confirms successful payment | `payment_completed` | `planId`, `amountInr` |
| Payments | `RootStack → Payments` | `app/screens/Payments/index.tsx` | Razorpay returns non-cancellation error | `payment_failed` | `planId`, `amountInr`, `reason` |

---

## 6 — Stamina System

| Screen / Layer | Route | Component | User Action | Event Name | Extra Properties |
|---|---|---|---|---|---|
| User Store (system) | — | `app/stores/user/index.ts` | Stamina drops below 10% threshold (first crossing) | `stamina_low_alert_shown` | `staminaPct` |

---

## 7 — Library (Technique Discovery)

| Screen | Route | Component | User Action | Event Name | Extra Properties |
|---|---|---|---|---|---|
| Library | `ExploreStack → Library` | `app/screens/Academy/Library/index.tsx` | Taps on a technique card (opens mode-select modal) | `library_technique_viewed` | `techniqueId`, `techniqueName`, `level` |
| Library | `ExploreStack → Library` | `app/screens/Academy/Library/index.tsx` | Chooses **Watch Tutorial** or **Start Exercise** in mode modal | `library_technique_started` | `techniqueId`, `techniqueName`, `mode` (`TUTORIAL`/`EXERCISE`) |

---

## 8 — Automatic Screen Views

Every navigation transition in the app fires automatically via the `NavigationContainer.onStateChange` hook in `App.tsx`. These produce `$screen_view` events in PostHog with the route name and params — no manual instrumentation required per screen.

---

## Suggested PostHog Funnels to Build

| Funnel Name | Events in Order |
|---|---|
| **Core Conversion** | `onboarding_completed` → `assessment_started` → `assessment_completed` → `paywall_viewed` → `payment_completed` |
| **Paywall Conversion** | `paywall_viewed` → `payment_started` → `payment_completed` |
| **Onboarding Drop-Off** | `onboarding_started` → `onboarding_step_viewed` → `onboarding_completed` |
| **Practice Retention** | `practice_session_started` → `practice_session_ended` (repeat, 7-day window) |
| **Assessment Funnel** | `assessment_started` → `assessment_step_viewed` → `assessment_completed` |
| **Activity Engagement** | `activity_started` → `activity_completed` |
