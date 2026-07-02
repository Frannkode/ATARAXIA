import { sql } from "drizzle-orm";
import { db } from "@/db";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok", database: "connected" });
  } catch {
    // Esperable hasta que Neon esté configurado (ver Preguntas-Cliente.md).
    // El endpoint sigue respondiendo 200 para no bloquear health checks de
    // infraestructura por algo que todavía depende del cliente.
    return Response.json({ status: "ok", database: "not_configured" });
  }
}
