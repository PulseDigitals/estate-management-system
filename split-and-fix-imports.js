import fs from "fs";
import path from "path";

// Paths - adjust if needed
const frontendSource = "client";
const backendSource = "server";
const frontendTarget = "src";
const backendTarget = "api";

// Utility: recursively move folder
function moveFolder(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`Source folder "${src}" does not exist. Skipping.`);
    return;
  }

  fs.mkdirSync(dest, { recursive: true });

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      moveFolder(srcPath, destPath);
      fs.rmdirSync(srcPath);
    } else {
      fs.renameSync(srcPath, destPath);
    }
  }
}

// Utility: update imports in .ts/.tsx/.js/.jsx files
function updateImports(folder, oldPath, newPath) {
  const entries = fs.readdirSync(folder, { withFileTypes: true });
  for (let entry of entries) {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      updateImports(fullPath, oldPath, newPath);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      let content = fs.readFileSync(fullPath, "utf8");
      const regex = new RegExp(oldPath, "g");
      content = content.replace(regex, newPath);
      fs.writeFileSync(fullPath, content, "utf8");
    }
  }
}

// Step 1: Move frontend and backend
console.log("Moving frontend files...");
moveFolder(frontendSource, frontendTarget);

console.log("Moving backend files...");
moveFolder(backendSource, backendTarget);

// Step 2: Fix imports
console.log("Fixing import paths in frontend...");
updateImports(frontendTarget, "../server", "../api"); // if frontend imported backend

console.log("Fixing import paths in backend...");
updateImports(backendTarget, "../client", "../src");   // if backend imported frontend

// Step 3: Instructions
console.log("\nUpdate package.json scripts as follows:\n");
console.log(`
"scripts": {
  "dev": "vite",
  "build": "vite build && esbuild api/index.ts --platform=node --bundle --format=esm --outdir=dist",
  "start": "node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push"
}`);
console.log("\nAll done! Frontend is now in /src, backend in /api, and imports updated.");