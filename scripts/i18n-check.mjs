// Checks translation resource integrity:
//  1. en and zh-CN locale files must define the exact same key sets
//  2. every t("...") / i18n.t("...") key referenced in app code must exist
// Exits non-zero on any mismatch so it can gate commits/CI.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const localesDir = join(root, "packages/i18n/src/locales");
const locales = readdirSync(localesDir).filter((name) =>
  statSync(join(localesDir, name)).isDirectory(),
);
const searchDirs = [
  join(root, "apps/yaak-client/components"),
  join(root, "apps/yaak-client/hooks"),
  join(root, "apps/yaak-client/lib"),
  join(root, "apps/yaak-client/routes"),
  join(root, "apps/yaak-client/init"),
];

function flatten(obj, prefix = "", out = new Set()) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value, path, out);
    else out.add(path);
  }
  return out;
}

const keysByLocale = new Map();
for (const locale of locales) {
  const dir = join(localesDir, locale);
  const keys = new Set();
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    flatten(JSON.parse(readFileSync(join(dir, file), "utf8")), "", keys);
  }
  keysByLocale.set(locale, keys);
}

let failed = false;
const [base, ...rest] = [...keysByLocale.keys()];
for (const locale of rest) {
  const baseKeys = keysByLocale.get(base);
  const localeKeys = keysByLocale.get(locale);
  const missing = [...baseKeys].filter((k) => !localeKeys.has(k));
  const extra = [...localeKeys].filter((k) => !baseKeys.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`[i18n] key mismatch between "${base}" and "${locale}":`);
    for (const key of missing) console.error(`  missing in ${locale}: ${key}`);
    for (const key of extra) console.error(`  unused in ${base}: ${key}`);
  }
}

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx)$/.test(entry)) yield path;
  }
}

const usedKeys = new Map();
for (const dir of searchDirs) {
  for (const path of walk(dir)) {
    const content = readFileSync(path, "utf8");
    const rx = /\b(?:i18n\.)?t\(\s*["']([a-zA-Z0-9_.]+)["']/g;
    for (const match of content.matchAll(rx)) {
      if (!usedKeys.has(match[1])) usedKeys.set(match[1], []);
      usedKeys.get(match[1]).push(relative(root, path));
    }
  }
}

const merged = new Set();
for (const keys of keysByLocale.values()) for (const key of keys) merged.add(key);
for (const [key, files] of usedKeys) {
  if (!merged.has(key)) {
    failed = true;
    console.error(`[i18n] key not found in resources: ${key} (used in ${files.join(", ")})`);
  }
}

if (failed) process.exit(1);
console.log(
  `[i18n] OK: ${locales.join(", ")} in sync; ${usedKeys.size} referenced keys all resolved`,
);
