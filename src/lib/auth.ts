import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
    // El driver neon-http de la app (Sprint 1-3) no soporta transacciones
    // reales. El adaptador de Drizzle de Better Auth ya default a `false`
    // desde la v1.3.12 (ver GitHub issue #4747, resuelto ahí) — se deja
    // explícito acá para que no dependa de ese default implícito.
    transaction: false,
  }),
  emailAndPassword: {
    enabled: true,
    // Sin ruta de registro pública: la única cuenta admin la crea
    // src/db/seed-admin.ts directo contra la DB, nunca vía esta API.
    disableSignUp: true,
  },
  rateLimit: {
    enabled: true,
    // En memoria (el default) no sirve en funciones serverless sin estado
    // compartido entre invocaciones — mismo motivo que orderRateLimitAttempts
    // en Sprint 2.
    storage: "database",
  },
  // Tiene que ser el último plugin (lo pide la documentación de Better
  // Auth): permite que signIn/signOut llamados desde Server Actions puedan
  // escribir la cookie de sesión usando next/headers.
  plugins: [nextCookies()],
});
