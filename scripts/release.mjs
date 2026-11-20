#!/usr/bin/env node
// Prepares a release commit for both EAS and F-Droid.
//
//   node scripts/release.mjs <patch|minor|major> "<changelog text>"
//
// - bumps expo.version (semver) and expo.android.versionCode in app.json
// - writes fastlane/metadata/android/en-US/changelogs/<versionCode>.txt
//   (shown by F-Droid; max 500 characters)
// - commits and creates the tag v<version>
//
// It does not push. Pushing master + the tag lets F-Droid see the release;
// pushing master to the expo-updates branch triggers the EAS Release
// workflow (OTA update, or a new build if native code changed).
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const [bump, ...changelogParts] = process.argv.slice(2);
const changelog = changelogParts.join(" ").trim();

function fail(message) {
  console.error(`release: ${message}`);
  process.exit(1);
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

if (!["patch", "minor", "major"].includes(bump) || !changelog) {
  fail('usage: node scripts/release.mjs <patch|minor|major> "<changelog text>"');
}
if (changelog.length > 500) {
  fail(`changelog is ${changelog.length} characters; F-Droid allows 500`);
}
if (git("rev-parse", "--abbrev-ref", "HEAD") !== "master") {
  fail("releases are made from master");
}
if (git("status", "--porcelain")) {
  fail("working tree has uncommitted changes; commit or stash them first");
}

const appJsonPath = "app.json";
const appJson = JSON.parse(readFileSync(appJsonPath, "utf8"));
const expo = appJson.expo;

const parts = expo.version.split(".").map(Number);
if (parts.length !== 3 || parts.some(Number.isNaN)) {
  fail(`can't parse version "${expo.version}"`);
}
let [major, minor, patch] = parts;
if (bump === "major") [major, minor, patch] = [major + 1, 0, 0];
if (bump === "minor") [minor, patch] = [minor + 1, 0];
if (bump === "patch") patch += 1;

const version = `${major}.${minor}.${patch}`;
const versionCode = (expo.android.versionCode ?? 0) + 1;
const tag = `v${version}`;

if (git("tag", "--list", tag)) {
  fail(`tag ${tag} already exists`);
}

expo.version = version;
expo.android.versionCode = versionCode;
writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`);

const changelogPath = `fastlane/metadata/android/en-US/changelogs/${versionCode}.txt`;
writeFileSync(changelogPath, `${changelog}\n`);

git("add", appJsonPath, changelogPath);
git("commit", "-m", `Release ${tag}`, "-m", changelog);
git("tag", "-a", tag, "-m", `RSSReels ${tag}`);

console.log(`Prepared ${tag} (versionCode ${versionCode}).`);
console.log("Push it with:");
console.log("  git push origin master --follow-tags");
console.log("  git push origin master:expo-updates");
