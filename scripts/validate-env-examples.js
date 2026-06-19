#!/usr/bin/env node
// Checks that every env var referenced in source is present in .env.example
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const examplePath = path.join(root, ".env.example");

const exampleKeys = new Set(
  fs.readFileSync(examplePath, "utf8")
    .split("\n")
    .filter((l) => l.match(/^[A-Z_]+=/) )
    .map((l) => l.split("=")[0])
);

// Grep source for process.env.X and NEXT_PUBLIC_X usage
const raw = execSync(
  `grep -rh --include="*.ts" --include="*.tsx" --include="*.js" ` +
  `"process\\.env\\.[A-Z_]\\+" ${path.join(root, "src")} 2>/dev/null || true`
).toString();

const used = new Set(
  [...raw.matchAll(/process\.env\.([A-Z_]+)/g)].map((m) => m[1])
);

const missing = [...used].filter((k) => !exampleKeys.has(k));

if (missing.length) {
  console.error("❌ Missing from .env.example:", missing.join(", "));
  process.exit(1);
}

console.log("✅ All env vars present in .env.example");
