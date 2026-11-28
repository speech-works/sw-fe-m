/**
 * DEV ONLY (preview harness): answers the app's API calls with sample data so the REAL program screens run without a
 * login or a server. Nothing here is imported by the normal app: it is reached only from the lab screens (FxWeb,
 * FxLab) and installs itself only while a lab screen is on (installLabApi / the returned restore function).
 *
 * How: axiosClient's `adapter` is replaced (every call in app/api goes through axiosClient) and its request
 * interceptors are switched off (they read SecureStore, which a web page has not got). Both are put back by restore().
 * Calls with no route here fail with a 404 and a console line "[lab] unrouted ...", so a missing stub is easy to see.
 */
import axiosClient from "../../api/axiosClient";
import { DATING_RAW } from "./fixtures/datingPack";

export type LabScenario = {
  /** Owner of the program (false = the sales page). */
  owned: boolean;
  /** Which day the progress call says is the current one (Home card, program page). */
  currentDay: number;
  /** Day numbers already finished. */
  doneDays: number[];
  /** Block ids shown as finished (ticked cards) on the day screens. */
  doneBlocks: string[];
  /** Day 2 and later: tell the app the next day is locked (day done screen text). */
  nextLocked: boolean;
  /** Day done: the goals the log card asks about. */
  goals: boolean;
};

export const DEFAULT_SCENARIO: LabScenario = { owned: true, currentDay: 1, doneDays: [], doneBlocks: [], nextLocked: true, goals: true };

const PACK_ID = "pack-dating";
const CATALOG_KEY = "dating_intimacy";
let scenario: LabScenario = DEFAULT_SCENARIO;
export const setLabScenario = (s: Partial<LabScenario>) => { scenario = { ...DEFAULT_SCENARIO, ...s }; };

const days: any[] = DATING_RAW.allModules;
const modId = (day: number) => `mod-d${day}`;
const dayOf = (id: string) => Number(String(id).replace("mod-d", ""));

function moduleFor(id: string) {
  const day = dayOf(id);
  const raw = DATING_RAW.modules.find((m: any) => m.dayIndex === day) ?? DATING_RAW.modules[0];
  return { ...raw, id, completedBlockIds: scenario.doneBlocks, completedBlockRun: 0 };
}

function progress() {
  const cur = scenario.currentDay;
  return {
    packStatus: scenario.doneDays.length ? "IN_PROGRESS" : "IN_PROGRESS",
    completedAt: null,
    startedAt: "2026-11-25T08:00:00.000Z",
    restartCount: 0,
    arcDays: DATING_RAW.pack.arcDays,
    currentDay: cur,
    nextIncompleteDay: cur,
    nextDayOpensAt: new Date(Date.now() + 9 * 3600 * 1000).toISOString(),
    modules: days.map((d) => ({
      moduleId: modId(d.dayIndex), title: d.title, orderIndex: d.orderIndex, dayIndex: d.dayIndex, isMandatory: true, attempts: 1,
      status: scenario.doneDays.includes(d.dayIndex) ? "COMPLETED" : d.dayIndex === cur ? "IN_PROGRESS" : "NOT_STARTED",
      completedAt: scenario.doneDays.includes(d.dayIndex) ? "2026-11-26T08:00:00.000Z" : null,
      unlocked: d.dayIndex <= cur,
    })),
  };
}

const brochure = () => ({
  id: PACK_ID, title: DATING_RAW.pack.title, description: DATING_RAW.pack.description, coverImage: null,
  category: "INTERVENTION", intensity: 2, philosophy: "SOCIAL", targetGoals: ["HANDLE_SITUATIONS"], arcDays: DATING_RAW.pack.arcDays,
  catalogKey: CATALOG_KEY, moduleCount: days.length,
  modules: days.map((d) => ({ id: modId(d.dayIndex), title: d.title, description: d.description, orderIndex: d.orderIndex, dayIndex: d.dayIndex, isMandatory: true, estimatedDurationMin: d.estimatedDurationMin })),
});

const offerItem = (key: string, title: string, shelf: string, price: number, blurb: string, owned: boolean, packId: string | null, arc: number | null, match: any = null) => ({
  key, title, shelf, tierProductId: "tier_" + key, priceInr: price, priceUsd: Math.round(price / 8) / 10 * 10, anchorPriceInr: price, anchorPriceUsd: price / 80,
  anchorTierProductId: null, owned, packId, arcDays: arc, blurb, coverImage: null, isNew: false, creditGrantAmount: 0, bonusMembershipDays: 0, match,
});

const offers = () => ({
  isFounderCohort: false, showMembershipOffer: false, signalLevel: "full", crisisSupport: null, bonusMembershipEligible: false, purchasesPaused: false,
  items: [
    offerItem(CATALOG_KEY, DATING_RAW.pack.title, "regular", 499, DATING_RAW.pack.description, scenario.owned, PACK_ID, 7, { level: "top", reason: "You said you want to handle situations like dates." }),
    offerItem("interview_ready", "Interview Ready", "regular", 499, "Seven short days to walk into an interview ready for the first question.", false, "pack-interview", 7),
    offerItem("hard_conversations", "Hard Conversations", "deep", 799, "Practice the conversations you keep putting off.", false, "pack-hard", 10),
    offerItem("bouncing_back", "Bouncing Back", "small", 299, "What to do in the hours after a hard moment.", false, "pack-bb", 7),
  ],
  topup: { productId: "topup", credits: 10, priceInr: 99, priceUsd: 1.99 },
  membership: { productId: "m", priceInr: 199, priceUsd: 3.99, annualProductId: "ma", annualPriceInr: 1999, annualPriceUsd: 39.99, annualAnchorInr: 2388, annualAnchorUsd: 47.88 },
});

const goalsState = () => ({
  harness: { question: "What would you like to be able to say?", verb: "say", noun: "line", count: 3, cues: [], placeholder: "", orderPrompt: "", smallerExample: "", reportPrompt: "", reportStyle: "did_it", answerType: "deed", version: 1, logFromDay: 1 },
  runIndex: 0,
  goals: scenario.goals ? [
    { id: "g1", noun: "name", text: "Say my name on a phone call", rank: 1, report: null, reportedAt: null, closedAt: null, answerType: "deed", reportStyle: "did_it" },
    { id: "g2", noun: "question", text: "Ask one question in a meeting", rank: 2, report: null, reportedAt: null, closedAt: null, answerType: "deed", reportStyle: "did_it" },
  ] : [],
  needsAsk: false, needsReport: false,
});

let lastActivity: any = null;
/** The practice a day step starts: a drill on the real-life-challenge screen (what "Advice you never agreed to" is). */
function activityFor(body: any) {
  const blk = DATING_RAW.modules.flatMap((m: any) => m.blocks).find((x: any) => x.type === "ACTIVITY" && x.content.refId === body?.contentId) ?? {};
  const c = blk.content ?? {};
  const now = new Date().toISOString();
  lastActivity = {
    id: "act-lab-1", status: "NOT_STARTED", contentType: "EXPOSURE_PRACTICE", startedAt: null, completedAt: null, createdAt: now, updatedAt: now, packId: body?.packId, moduleId: body?.moduleId,
    exposurePractice: { id: c.refId, type: "TECHNIQUE_DRILL", name: c.titleOverride ?? "Practice", description: c.descriptionOverride ?? "", difficulty: "EASY",
      realLifeChallengeData: { category: "TECHNIQUE_DRILL", instructions: c.instructionsOverride ?? c.descriptionOverride ?? "", encouragement: c.encouragementOverride ?? "", completionCriteria: c.completionPromptOverride ?? "", completionPlaceholder: c.completionPlaceholderOverride ?? "" } },
  };
  return lastActivity;
}

type Route = [string, RegExp, (m: RegExpMatchArray, body: any) => any];
const routes = (): Route[] => [
  ["GET", /^\/packs\/recommended$/, () => ({ pack: { id: PACK_ID, title: DATING_RAW.pack.title, description: DATING_RAW.pack.description, catalogKey: CATALOG_KEY, icon: null, coverImage: null, category: "INTERVENTION", intensity: 2, philosophy: "SOCIAL", targetGoals: [], modules: [] }, strategy: "CHALLENGE", isRefresher: false, tags: [] })],
  ["GET", /^\/packs\/[^/]+\/progress$/, () => progress()],
  ["GET", /^\/packs\/[^/]+\/brochure$/, () => brochure()],
  ["GET", /^\/packs\/[^/]+\/modules\/([^/]+)$/, (m) => moduleFor(m[1])],
  ["POST", /^\/packs\/[^/]+\/modules\/[^/]+\/start$/, () => ({})],
  ["POST", /^\/packs\/[^/]+\/modules\/[^/]+\/complete$/, () => ({})],
  ["POST", /^\/packs\/[^/]+\/modules\/[^/]+\/blocks\/([^/]+)\/done$/, (m, b) => ({ completedBlockIds: [...scenario.doneBlocks, m[1]], run: b?.run ?? 0, applied: true })],
  ["GET", /^\/packs\/[^/]+\/modules\/[^/]+\/blocks\/[^/]+\/recall$/, () => ({ items: [], savedAt: null })],
  ["POST", /^\/packs\/[^/]+\/restart$/, () => ({})],
  ["GET", /^\/program-goals\/pack\/[^/]+$/, () => goalsState()],
  ["GET", /^\/program-goals\/reach$/, () => ({ total: 0, done: 0, waiting: 0, predictions: 0 })],
  ["POST", /^\/quiz\/submit$/, () => ({ isCorrect: true, masteryScore: 80, currentStreak: 1, bestStreak: 1, passedThreshold: false, totalAttempts: 1, correctCount: 1 })],
  ["GET", /^\/users\/me\/offers$/, () => offers()],
  ["GET", /^\/users\/me\/wallet$/, () => ({ credits: 10, entitlements: [] })],
  ["POST", /^\/forms\/[^/]+\/submit$/, () => ({ id: "resp-1" })],
  ["POST", /^\/practice-activities$/, (_m, b) => activityFor(b)],
  ["POST", /^\/practice-activities\/[^/]+\/start$/, () => ({ ...lastActivity, status: "ONGOING", startedAt: new Date().toISOString() })],
  ["POST", /^\/practice-activities\/[^/]+\/complete$/, () => ({ ...lastActivity, status: "COMPLETED", completedAt: new Date().toISOString() })],
  ["GET", /^\/exposure-practice\/[^/]+\/easier$/, () => ({ activity: null })],
  ["GET", /^\/practice-activities(\/.*)?$/, () => []],
  ["GET", /^\/packs\/[^/]+\/evidence$/, () => ({ catalogKey: CATALOG_KEY, title: DATING_RAW.pack.title, lastCheckedAt: null, oldestCheckedAt: null, claimCount: 0, contestedCount: 0, claims: [] })],
];

let restore: (() => void) | null = null;

/** Start answering API calls from the sample data. Returns a function that puts the real client back. Safe to call twice. */
export function installLabApi(s?: Partial<LabScenario>): () => void {
  if (s) setLabScenario(s);
  if (restore) return restore;
  const client: any = axiosClient;
  const oldAdapter = client.defaults.adapter;
  const reqHandlers = client.interceptors.request.handlers;
  client.interceptors.request.handlers = [];
  client.defaults.adapter = async (config: any) => {
    const url = String(config.url ?? "").replace(/^https?:\/\/[^/]+/, "").split("?")[0];
    const method = String(config.method ?? "get").toUpperCase();
    let body: any = undefined;
    try { body = typeof config.data === "string" ? JSON.parse(config.data) : config.data; } catch { /* ignore */ }
    const hit = routes().find(([mm, re]) => mm === method && re.test(url));
    const reply = (status: number, data: any) => {
      const response = { data, status, statusText: String(status), headers: {}, config, request: {} };
      if (status >= 400) { const err: any = new Error("Request failed with status code " + status); err.isAxiosError = true; err.config = config; err.response = response; throw err; }
      return response;
    };
    await new Promise((r) => setTimeout(r, 30));
    if (!hit) { console.warn("[lab] unrouted " + method + " " + url); return reply(404, { message: "lab: no stub" }); }
    // #program=...,day2,locked (the day-locked screen): day 2 and later answer 403 PACK_DAY_LOCKED, as the server does
    if (method === "GET" && /^\/packs\/[^/]+\/modules\/mod-d(\d+)$/.test(url) && (globalThis as any).location?.hash?.includes(",locked")) {
      const day = Number(url.match(/mod-d(\d+)$/)![1]);
      if (day >= 2) return reply(403, { errorCode: "PACK_DAY_LOCKED", error: "This day is not open yet" });
    }
    return reply(200, JSON.parse(JSON.stringify(hit[2](url.match(hit[1]) as RegExpMatchArray, body))));
  };
  restore = () => { client.defaults.adapter = oldAdapter; client.interceptors.request.handlers = reqHandlers; restore = null; };
  return restore;
}
