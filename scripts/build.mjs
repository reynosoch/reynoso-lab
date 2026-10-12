import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const dist = resolve(root, "dist");
const validation = spawnSync(process.execPath, [resolve(root, "scripts/validate-site.mjs")], { stdio: "inherit" });
if (validation.status !== 0) process.exit(validation.status ?? 1);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
const entries = ["index.html", "styles.css", "app.js", ".nojekyll", "LICENSE", "assets", "data", "experiments", "lib"];
for (const entry of entries) await cp(resolve(root, entry), resolve(dist, entry), { recursive: true });
console.log(`Build listo en ${dist}`);
