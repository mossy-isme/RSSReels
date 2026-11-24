#!/usr/bin/env node
// Validates directory/feeds.json before you push it.
//
//   npm run directory:check            # shape checks + fetch every feed
//   npm run directory:check -- --offline   # shape checks only
//
// Exits non-zero if anything is wrong, so it's safe to use in CI.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SCHEMA_VERSION = 1;
const path = fileURLToPath(new URL("../directory/feeds.json", import.meta.url));
const offline = process.argv.includes("--offline");

const problems = [];
const warnings = [];

let doc;
try {
  doc = JSON.parse(readFileSync(path, "utf8"));
} catch (error) {
  console.error(`✗ ${path} is not valid JSON: ${error.message}`);
  process.exit(1);
}

if (doc.schemaVersion !== SCHEMA_VERSION) {
  problems.push(`schemaVersion must be ${SCHEMA_VERSION} (got ${doc.schemaVersion})`);
}
if (typeof doc.updatedAt !== "string" || Number.isNaN(Date.parse(doc.updatedAt))) {
  problems.push("updatedAt must be an ISO timestamp, e.g. 2026-11-24T00:00:00Z");
} else if (Date.parse(doc.updatedAt) > Date.now() + 60_000) {
  warnings.push("updatedAt is in the future");
}
if (!Array.isArray(doc.categories)) problems.push("categories must be an array");
if (typeof doc.regions !== "object" || doc.regions === null) problems.push("regions must be an object");
if (!Array.isArray(doc.feeds) || doc.feeds.length === 0) problems.push("feeds must be a non-empty array");

const categories = new Set(doc.categories ?? []);
const regions = new Set(Object.keys(doc.regions ?? {}));
const seen = new Map();
const normalize = (url) =>
  url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");

for (const [index, feed] of (doc.feeds ?? []).entries()) {
  const where = `feeds[${index}] (${feed?.title ?? "untitled"})`;
  for (const field of ["title", "url", "site", "description", "category", "region"]) {
    if (typeof feed?.[field] !== "string" || !feed[field].trim()) {
      problems.push(`${where}: missing "${field}"`);
    }
  }
  if (feed?.url && !/^https:\/\//.test(feed.url)) problems.push(`${where}: url should be https`);
  if (feed?.category && !categories.has(feed.category)) {
    problems.push(`${where}: category "${feed.category}" isn't in "categories"`);
  }
  if (feed?.region && !regions.has(feed.region)) {
    problems.push(`${where}: region "${feed.region}" isn't in "regions"`);
  }
  if (feed?.url) {
    const key = normalize(feed.url);
    if (seen.has(key)) problems.push(`${where}: duplicate of feeds[${seen.get(key)}]`);
    seen.set(key, index);
  }
}

if (problems.length === 0 && !offline) {
  console.log(`Fetching ${doc.feeds.length} feeds…`);
  const results = await Promise.all(
    doc.feeds.map(async (feed, index) => {
      try {
        const response = await fetch(feed.url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; RSSReels directory check)" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) return `feeds[${index}] (${feed.title}): HTTP ${response.status}`;
        const head = (await response.text()).slice(0, 4000);
        if (/<rdf:RDF/i.test(head)) return `feeds[${index}] (${feed.title}): RSS 1.0/RDF isn't supported by the app`;
        if (!/<rss|<feed|^\s*\{/i.test(head)) return `feeds[${index}] (${feed.title}): not an RSS/Atom/JSON feed`;
        return null;
      } catch (error) {
        return `feeds[${index}] (${feed.title}): ${error.name === "TimeoutError" ? "timed out" : error.message}`;
      }
    }),
  );
  problems.push(...results.filter(Boolean));
}

for (const warning of warnings) console.warn(`! ${warning}`);
if (problems.length > 0) {
  for (const problem of problems) console.error(`✗ ${problem}`);
  console.error(`\n${problems.length} problem(s) in directory/feeds.json`);
  process.exit(1);
}
console.log(`✓ directory/feeds.json OK — ${doc.feeds.length} feeds${offline ? " (offline check)" : ""}`);
