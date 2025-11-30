import fs from "fs";
import path from "path";

// Paths - adjust if your current folders are different
const frontendSource = "client"; // change if your frontend folder has a different name
const backendSource = "server";  // backend folder
const frontendTarget = "src";
const backendTarget = "api";

// Helper function to move folder recursively
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

// Move frontend
console.log("Moving frontend files...");
moveFolder(frontendSource, frontendTarget);

// Move backend
console.log("Moving backend files...");
moveFolder(backendSource, backendTarget);

// Instructions to update package.json
console.log("\nUpdate package.json scripts as follows:\n");
console.log(`
"scripts": {
  "dev": "vite",
  "build": "vite build && esbuild api/index.ts --platform=node --bundle --format=esm --outdir=dist",
  "start": "node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push"
}`);
console.log("\nAll done! Frontend is now in /src and backend in /api.");
