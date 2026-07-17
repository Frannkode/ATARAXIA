import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Los *.integration.test.ts comparten la misma Postgres local (TEST_DATABASE_URL)
    // y hacen DELETE/INSERT sin aislar filas por archivo — correrlos en paralelo
    // (default de Vitest) provoca que un archivo pise los datos del otro a mitad
    // de test. Es una base de datos compartida, no vale la pena aislarla por
    // archivo para una suite de este tamaño.
    fileParallelism: false,
  },
});
