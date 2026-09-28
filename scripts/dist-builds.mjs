#!/usr/bin/env node
/**
 * Store build files in dist/: dated names, and old builds kept, never deleted.
 *
 *   dist/                      the LATEST build of each kind, and nothing else we write
 *   dist/obsolete/             every earlier build, moved here, never deleted
 *   dist/.incoming/            where a build is written until it succeeds
 *   dist/ota/                  the OTA export (scripts/update-production.mjs), which
 *                              `expo export` clears; no build file ever lives there
 *
 * A "kind" is a stem plus an extension: Speechworks .ipa, sw-fe-m .aab,
 * sw-fe-m .apk (preview) and sw-fe-m-production .apk. Names carry the app
 * version and the local time, e.g. Speechworks-1.0.2-20260928-0121.ipa.
 *
 *   node scripts/dist-builds.mjs next <stem> <ext>   print a fresh path in dist/.incoming/
 *   node scripts/dist-builds.mjs place <path>        move older builds of that kind to
 *                                                    dist/obsolete/, then the new one to dist/
 *   node scripts/dist-builds.mjs latest <stem> <ext> print the current build of that kind
 *
 * The build scripts in package.json run `next`, build to that path, and run
 * `place` only when the build succeeded, so a failed build leaves dist/ as it
 * was. Nothing here removes a file. DIST_DIR overrides dist/ for tests.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.resolve(process.env.DIST_DIR || path.join(root, "dist"));
const obsolete = path.join(dist, "obsolete");
const incoming = path.join(dist, ".incoming");

const fail = (msg) => {
  console.error(`dist-builds: ${msg}`);
  process.exit(1);
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Undated legacy names (Speechworks.ipa) and dated ones, with a -2 collision suffix. */
const kindPattern = (stem, ext) =>
  new RegExp(`^${escape(stem)}(-\\d+\\.\\d+\\.\\d+-\\d{8}-\\d{4}(-\\d+)?)?\\.${escape(ext)}$`);

/** Stem and extension back out of a dated name this script made. */
const parseName = (file) => {
  const m = /^(.+)-\d+\.\d+\.\d+-\d{8}-\d{4}(-\d+)?\.([a-z0-9]+)$/i.exec(path.basename(file));
  if (!m) fail(`not a dated build name: ${file}`);
  return { stem: m[1], ext: m[3] };
};

const appVersion = () => {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  const config = createRequire(import.meta.url)(path.join(root, "app.config.js"));
  const version = config?.expo?.version;
  if (!version) fail("could not read expo.version from app.config.js");
  return version;
};

const stamp = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

/** A path in `dir` for `name` that does not exist yet: name, name-2, name-3... */
const freePath = (dir, name) => {
  const ext = path.extname(name);
  const base = name.slice(0, -ext.length);
  let candidate = path.join(dir, name);
  for (let i = 2; fs.existsSync(candidate); i++) candidate = path.join(dir, `${base}-${i}${ext}`);
  return candidate;
};

/** Top-level files of one kind in dist/, newest first. */
const buildsOfKind = (stem, ext) => {
  if (!fs.existsSync(dist)) return [];
  const re = kindPattern(stem, ext);
  return fs
    .readdirSync(dist, { withFileTypes: true })
    .filter((e) => e.isFile() && re.test(e.name))
    .map((e) => path.join(dist, e.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
};

const [cmd, ...args] = process.argv.slice(2);

if (cmd === "next") {
  const [stem, ext] = args;
  if (!stem || !ext) fail("usage: next <stem> <ext>");
  fs.mkdirSync(incoming, { recursive: true });
  console.log(freePath(incoming, `${stem}-${appVersion()}-${stamp()}.${ext}`));
} else if (cmd === "place") {
  const [staged] = args;
  if (!staged || !fs.existsSync(staged)) fail(`no build file at ${staged} (did the build fail?)`);
  const { stem, ext } = parseName(staged);
  const older = buildsOfKind(stem, ext);
  if (older.length) fs.mkdirSync(obsolete, { recursive: true });
  for (const file of older) {
    const to = freePath(obsolete, path.basename(file));
    fs.renameSync(file, to);
    console.error(`moved ${path.relative(path.dirname(dist), file)} -> ${path.relative(path.dirname(dist), to)}`);
  }
  const final = freePath(dist, path.basename(staged));
  fs.renameSync(staged, final);
  console.log(final);
} else if (cmd === "latest") {
  const [stem, ext] = args;
  if (!stem || !ext) fail("usage: latest <stem> <ext>");
  const [newest] = buildsOfKind(stem, ext);
  if (!newest) fail(`no ${stem} .${ext} build in ${dist}`);
  console.log(newest);
} else {
  fail("usage: next <stem> <ext> | place <path> | latest <stem> <ext>");
}
