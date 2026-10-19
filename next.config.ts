import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import pkg from "./package.json";

// Shown on the login page and in the account menu, to check which build is deployed.
// The Docker image has no .git: Coolify can pass the commit as the SOURCE_COMMIT build argument.
function commit() {
  if (process.env.SOURCE_COMMIT) return process.env.SOURCE_COMMIT.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

const builtAt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date());

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    APP_VERSION: [`v${pkg.version}`, `build du ${builtAt}`, commit()].filter(Boolean).join(" · "),
  },
  experimental: {
    // Documents (passport scans, PDF tickets) are uploaded through Server Actions.
    serverActions: { bodySizeLimit: "16mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
