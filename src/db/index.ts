import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// DATABASE_URL llega de Neon (ver .env.example y Context/Preguntas-Cliente.md).
// Se usa un placeholder cuando falta para no romper el arranque en dev/build;
// cualquier query real contra el placeholder falla de forma controlada y es
// lo que reporta GET /api/health.
const connectionString =
  process.env.DATABASE_URL ?? "postgresql://user:password@host.tld/dbname?option=value";

const sql = neon(connectionString);

export const db = drizzle(sql, { schema });
