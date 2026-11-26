#!/usr/bin/env node
/**
 * DEV ONLY: screenshot of one preview-harness screen (lab links: the phone screen only, exact viewport; daydone links: the phone frame), device scale 2.
 *   node scripts/shoot-preview.mjs "<hash link or full URL>" <out.png> [--delay 2500] [--base http://localhost:8096] [--logs]
 * Example:
 *   node scripts/shoot-preview.mjs "#program=390x844,day1,step=5,dark" /tmp/q.png
 * The hash is the one from app/screens/FxLab/ProgramLab.tsx (also "#daydone=390x844,goals,dark"). Waits for fonts, then
 * --delay ms (default 2500; links with do=... actions get their action time added). Prints console errors and unrouted
 * lab API calls (the known video error of Day 1 step 1 is ignored for the exit code); exit code 2 if the page logged a red error. Needs playwright-core (found in this repo or in sw-landing)
 * and a Chromium from `npx playwright install chromium` (found in ~/Library/Caches/ms-playwright).
 */
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import os from "node:os";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const delay = Number(flag("--delay", "2500")), base = flag("--base", "http://localhost:8096"), showLogs = args.includes("--logs");
const [link, out] = args.filter(a => a !== "--logs");
if (!link || !out) { console.error("usage: shoot-preview.mjs <hash|url> <out.png> [--delay ms] [--base url]"); process.exit(1); }

const roots = [process.cwd(), new URL("..", import.meta.url).pathname, "/Users/mayankav/Documents/speechworks-2/sw-landing"];
let pw;
for (const r of roots) { try { pw = createRequire(join(r, "package.json"))("playwright-core"); break; } catch { /* next */ } }
if (!pw) { console.error("playwright-core not found"); process.exit(1); }
const cache = join(os.homedir(), "Library/Caches/ms-playwright");
let exe;
try { const d = readdirSync(cache).filter(x => x.startsWith("chromium-")).sort().pop(); if (d) for (const p of ["chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium", "chrome-mac/Chromium.app/Contents/MacOS/Chromium", "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"]) if (existsSync(join(cache, d, p))) { exe = join(cache, d, p); break; } } catch { /* default */ }

let url = link.startsWith("http") ? link : base + "/" + (link.startsWith("#") ? link : "#" + link);
const isLab = /#(program|steps|reading|practice|form|programpage|programs|home)=/.test(url);
if (isLab && !/,bare/.test(url)) url += ",bare";   // only the phone screen, the window is the phone
const m = url.match(/#\w+=(\d+)x(\d+)/);
const [w, h] = m ? [+m[1], +m[2]] : [390, 844];
const acts = (decodeURIComponent(url).match(/do=([^,]*)/)?.[1] ?? "").split(";").filter(Boolean);
const extra = acts.reduce((t, a) => t + (a.startsWith("wait:") ? Number(a.slice(5)) || 500 : 800), 0) + (/practice=/.test(url) ? 1500 : 0) + (/part=(\d+)/.test(url) ? 800 * Number(url.match(/part=(\d+)/)[1]) : 0) + (/scrolled/.test(url) ? 800 : 0);

const browser = await pw.chromium.launch({ headless: true, ...(exe ? { executablePath: exe } : {}) });
const page = await (await browser.newContext({ viewport: isLab ? { width: w, height: h } : { width: Math.max(w + 120, 700), height: h + 140 }, deviceScaleFactor: 2 })).newPage();
const errors = [];
page.on("console", msg => { const t = msg.text(); if (msg.type() === "error" || /\[lab\] (unrouted|action)/.test(t)) errors.push(msg.type() + ": " + t.slice(0, 300)); else if (showLogs) console.log(msg.type() + ": " + t.slice(0, 300)); });
page.on("pageerror", e => errors.push("pageerror: " + String(e.message).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
const frame = isLab ? page : page.locator('[data-testid="dd-frame"]').first();
if (isLab) await page.waitForSelector('[data-lab-root="1"]', { timeout: 90000 }); else await frame.waitFor({ timeout: 90000 });
await page.waitForTimeout(delay + extra);
mkdirSync(dirname(out), { recursive: true });
await frame.screenshot({ path: out });
await browser.close();
if (errors.length) { console.log("PAGE LOGS (" + errors.length + "):\n" + errors.slice(0, 12).join("\n")); }
console.log("saved " + out);
process.exit(errors.some(e => e.startsWith("pageerror") && !/findDOMNode/.test(e)) ? 2 : 0);
