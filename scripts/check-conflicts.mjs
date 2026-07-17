import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ignored = new Set([".git", "node_modules", ".next", "dist", "coverage"]);
const conflictMarker = /^(<<<<<<<|=======|>>>>>>>) /m;
const offenders = [];

function walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (ignored.has(entry)) continue;
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path);
      continue;
    }
    if (stat.size > 2_000_000) continue;
    const content = readFileSync(path, "utf8");
    if (conflictMarker.test(content)) offenders.push(path);
  }
}

walk(process.cwd());

if (offenders.length) {
  console.error(`发现未解决的 Git 冲突标记:\n${offenders.join("\n")}`);
  process.exit(1);
}

console.log("未发现 Git 冲突标记。");
