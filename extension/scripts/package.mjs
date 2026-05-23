import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const extDir = path.join(__dirname, "..");
const distDir = path.join(extDir, "dist");
const releaseDir = path.join(extDir, "release");

if (!existsSync(distDir)) {
  console.error(
    "[package] dist/ not found — run `npm run build` first."
  );
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync(path.join(distDir, "manifest.json"), "utf8")
);
const version = manifest.version;
const name = (manifest.short_name || manifest.name || "tokenguard")
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-");

mkdirSync(releaseDir, { recursive: true });

// Chrome wants a flat zip of the dist contents (no parent folder).
const zipPath = path.join(releaseDir, `${name}-v${version}.zip`);
if (existsSync(zipPath)) rmSync(zipPath);

// Use the system `zip` to produce a deterministic, well-formed archive.
// We deliberately exclude source maps from the published build.
execSync(
  `cd "${distDir}" && zip -rq -X "${zipPath}" . -x "*.map" "*.DS_Store"`
);

const sizeMb = (statSync(zipPath).size / 1024 / 1024).toFixed(2);
console.log(`[package] wrote ${zipPath} (${sizeMb} MB)`);
console.log(
  `[package] upload this zip to the Chrome Web Store dashboard.`
);

// Also produce a Firefox-flavored zip (xpi) — Mozilla accepts the same
// MV3 manifest with the `browser_specific_settings` block we already include.
const xpiPath = path.join(releaseDir, `${name}-v${version}.xpi`);
if (existsSync(xpiPath)) rmSync(xpiPath);
execSync(
  `cd "${distDir}" && zip -rq -X "${xpiPath}" . -x "*.map" "*.DS_Store"`
);
console.log(`[package] wrote ${xpiPath} (Firefox AMO upload)`);
