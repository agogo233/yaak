#!/usr/bin/env node
/**
 * Fails the build when a copied asset is not where the app fetches it from.
 *
 * `PdfViewer` and the page head address these by URL, but nothing ties those
 * URLs to the `viteStaticCopy` targets, and a target that mirrors its source
 * path instead of landing at the root still builds cleanly — the miss only
 * shows up as a 404 once the app runs.
 *
 * This runs as a separate step after `vp build` instead of as a bundler
 * plugin: Vite-Plus/Rolldown fires `closeBundle` before the bundle is written
 * to disk, so an in-hook check always sees an empty output directory.
 */
import fs from "node:fs";
import path from "node:path";

const yaakTarget = process.env.YAAK_TARGET === "web" ? "web" : "desktop";
// This script lives at `apps/yaak-client/scripts/`, so the app's configured
// `outDir` (`../../dist/apps/yaak-client` from the app root) is three levels
// up from here.
const outDir = path.resolve(import.meta.dirname, "../../../dist/apps/yaak-client");
const expected = [
  "cmaps",
  "standard_fonts",
  "favicon.ico",
  "icon-128.png",
  ...(yaakTarget === "web" ? ["og.png"] : []),
];

/** Compact recursive listing, to show where the assets actually landed. */
function treeSummary(root, maxEntries = 200, maxDepth = 4) {
  const lines = [];
  let count = 0;
  const walk = (dir, label, depth) => {
    if (count >= maxEntries || depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (count >= maxEntries) {
        lines.push(`${label}/… (truncated)`);
        return;
      }
      count += 1;
      const child = label ? `${label}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        lines.push(`${child}/`);
        walk(path.join(dir, entry.name), child, depth + 1);
      } else {
        lines.push(child);
      }
    }
  };
  walk(root, "", 0);
  return lines.length > 0 ? lines.join("\n") : "(directory is empty or does not exist)";
}

const missing = expected.filter((asset) => {
  const full = path.join(outDir, asset);
  if (!fs.existsSync(full)) return true;
  const stat = fs.statSync(full);
  return stat.isDirectory() && fs.readdirSync(full).length === 0;
});

if (missing.length > 0) {
  console.error(
    `Copied assets missing from ${outDir}: ${missing.join(", ")}. ` +
      `Every viteStaticCopy target needs to strip its base path, or it lands ` +
      `under a copy of the directories it came from instead.\n` +
      `--- actual contents of ${outDir} ---\n${treeSummary(outDir)}`,
  );
  process.exit(1);
}

console.log(`[verify-served-assets] OK: ${expected.join(", ")} present in ${outDir}`);
