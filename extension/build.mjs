import { build, context } from "esbuild";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const isWatch = process.argv.includes("--watch");

const entryPoints = {
  "background/service-worker": "src/background/service-worker.ts",
  "content/chatgpt-injector": "src/content/chatgpt-injector.ts",
  "content/claude-injector": "src/content/claude-injector.ts",
  "content/ui-toolbar": "src/content/ui-toolbar.ts",
  "popup/popup": "src/popup/popup.ts",
  "options/options": "src/options/options.ts"
};

const buildOptions = {
  entryPoints,
  outdir: dist,
  bundle: true,
  format: "iife",
  target: ["chrome114", "firefox115"],
  sourcemap: true,
  logLevel: "info",
  loader: { ".wasm": "file" },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV ?? "development"
    )
  }
};

async function copyStatic() {
  await mkdir(dist, { recursive: true });
  await mkdir(path.join(dist, "popup"), { recursive: true });
  await mkdir(path.join(dist, "options"), { recursive: true });
  await mkdir(path.join(dist, "icons"), { recursive: true });

  await copyFile(
    path.join(__dirname, "src", "popup", "popup.html"),
    path.join(dist, "popup", "popup.html")
  );
  await copyFile(
    path.join(__dirname, "src", "options", "options.html"),
    path.join(dist, "options", "options.html")
  );

  // Manifest gets dist-relative paths (no `src/`).
  const manifest = JSON.parse(
    await readFile(path.join(__dirname, "src", "manifest.json"), "utf8")
  );
  await writeFile(
    path.join(dist, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  // Generate placeholder icons on first build, then copy them into dist.
  const iconsDir = path.join(__dirname, "icons");
  const sizes = [16, 32, 48, 128];
  const missing = sizes.some(
    (s) => !existsSync(path.join(iconsDir, `icon-${s}.png`))
  );
  if (missing) {
    const result = spawnSync(
      process.execPath,
      [path.join(__dirname, "scripts", "generate-icons.mjs")],
      { stdio: "inherit" }
    );
    if (result.status !== 0) {
      throw new Error("icon generation failed");
    }
  }
  for (const size of sizes) {
    const src = path.join(iconsDir, `icon-${size}.png`);
    if (existsSync(src)) {
      await copyFile(src, path.join(dist, "icons", `icon-${size}.png`));
    }
  }
}

async function main() {
  await copyStatic();
  if (isWatch) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log("[TokenGuard] esbuild watching…");
  } else {
    await build(buildOptions);
    console.log("[TokenGuard] build complete →", dist);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
