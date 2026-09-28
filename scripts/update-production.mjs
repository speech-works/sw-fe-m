#!/usr/bin/env node
/**
 * Publish a production OTA update with the production env, never the local one.
 *
 *   npm run update:production -- "Form cards show the day's text"
 *   npm run update:production -- --dry-run "Form cards show the day's text"
 *
 * - The env is eas.json build.production.env, the values the store builds
 *   used. `.env` (API_BASE_URL=http://localhost:3000) is never read:
 *   EXPO_NO_DOTENV=1 is set, and the app.config.js inputs eas.json does not
 *   set are removed from the inherited shell env.
 * - Refuses when the git tree is dirty, when no message is given, or when
 *   the API_BASE_URL that `expo config` actually resolves is not https.
 * - Runs eas update --channel production --environment production and
 *   exports to dist/ota/ with --input-dir. `expo export` clears its output
 *   folder, and dist/ holds the store builds (scripts/dist-builds.mjs), so
 *   the export never gets dist/ itself.
 * - --dry-run prints the resolved env and the command, and publishes nothing.
 *
 * `--environment production` also layers the EAS-hosted production variables
 * over the bundle env at export time. This script cannot see those; keep them
 * in line with eas.json (`eas env:list --environment production`).
 */
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INPUT_DIR = "dist/ota";

const fail = (msg) => {
  console.error(`update:production refused: ${msg}`);
  process.exit(1);
};

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const message = args.filter((a) => a !== "--dry-run").join(" ").trim();
if (!message) fail('a message is required: npm run update:production -- "what changed"');
if (message.startsWith("-")) fail(`unknown flag ${message.split(" ")[0]}`);

// 1. Clean tree. An update is built from the working copy, so anything
//    uncommitted (or untracked and imported) would ship without a commit.
const status = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
if (status.trim()) fail(`the git tree is dirty:\n${status}`);

// 2. The production env, from eas.json only.
const eas = JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
const prodEnv = eas?.build?.production?.env;
if (!prodEnv || typeof prodEnv !== "object") fail("eas.json has no build.production.env");

// Everything app.config.js reads. Any of these left over in the shell and not
// set by eas.json would reach the update, so they are removed rather than
// inherited.
const CONFIG_INPUTS = [
  "API_BASE_URL",
  "PAYMENTS_ENABLED",
  "PRE_AUTH_ONBOARDING_ENABLED",
  "ALLOW_SIMULATOR_HEADSET_BYPASS",
  "REVENUECAT_ANDROID_API_KEY",
  "REVENUECAT_IOS_API_KEY",
  "EAS_BUILD_PROFILE",
];
const env = { ...process.env };
for (const key of CONFIG_INPUTS) delete env[key];
for (const key of Object.keys(env)) if (key.startsWith("EXPO_PUBLIC_")) delete env[key];
Object.assign(env, prodEnv, { EXPO_NO_DOTENV: "1" });

// 3. The URL the update will actually carry. eas-cli builds the update's app
//    config with this same command, so this is the value, not a guess at it.
const configJson = execFileSync("npx", ["expo", "config", "--json", "--type", "public"], {
  cwd: root,
  env,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "inherit"],
});
const extra = JSON.parse(configJson)?.extra ?? {};
const apiBaseUrl = extra.API_BASE_URL;
if (typeof apiBaseUrl !== "string" || !/^https:\/\//i.test(apiBaseUrl)) {
  fail(`API_BASE_URL resolves to ${JSON.stringify(apiBaseUrl)}, not an https URL`);
}

const command = [
  "eas",
  "update",
  "--channel",
  "production",
  "--environment",
  "production",
  "--input-dir",
  INPUT_DIR,
  "--message",
  message,
];

const show = (v) => (/KEY|TOKEN|SECRET/i.test(v[0]) ? `${String(v[1]).slice(0, 8)}...` : v[1]);
console.log("Resolved env (eas.json build.production.env, EXPO_NO_DOTENV=1):");
for (const entry of Object.entries(prodEnv)) console.log(`  ${entry[0]}=${show(entry)}`);
console.log(`expo config extra.API_BASE_URL: ${apiBaseUrl}`);
console.log(`runtime: app version ${JSON.parse(configJson)?.version}`);
console.log(`command: ${command.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`);

if (dryRun) {
  console.log("--dry-run: nothing published.");
  process.exit(0);
}

const run = spawnSync(command[0], command.slice(1), { cwd: root, env, stdio: "inherit" });
process.exit(run.status ?? 1);
