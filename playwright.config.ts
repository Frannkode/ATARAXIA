import { existsSync, readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Next.js carga .env solo dentro de su propio proceso; el proceso de
// Playwright necesita las mismas variables (ADMIN_EMAIL, etc.) para armar
// los tests, así que las levantamos acá a mano (no hay dependencia a dotenv
// en el proyecto).
function loadDotEnv(path: string) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv(".env");

// 3000: hay un `next dev` de esta misma sesión ya corriendo en ese puerto
// (Next.js no permite un segundo `next dev` concurrente en el mismo
// directorio, aunque sea otro puerto, por el lockfile de .next/dev) —
// reusarlo en vez de pelear con el lock.
const PORT = 3000;

// E2E_BASE_URL: corre la misma suite contra un deploy real (ej. el
// subdominio de Vercel) en vez de local — en ese caso no hay que levantar
// ningún dev server, el sitio ya está corriendo ahí.
const remoteBaseUrl = process.env.E2E_BASE_URL;
const BASE_URL = remoteBaseUrl ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  timeout: 45_000,
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(remoteBaseUrl
    ? {}
    : {
        webServer: {
          command: `npx next dev --port ${PORT}`,
          url: BASE_URL,
          reuseExistingServer: true,
          timeout: 60_000,
        },
      }),
});
