/**
 * Bootstrap de la cuenta admin (Sprint 4, Historia 4.1). No hay ruta de
 * registro pública (emailAndPassword.disableSignUp: true en src/lib/auth.ts,
 * que además bloquearía esta misma llamada si se hiciera vía auth.api) — se
 * inserta directo contra la DB, replicando exactamente lo que el handler de
 * sign-up de Better Auth hace internamente (mismo hash, mismo shape de
 * user+account) para que el login normal funcione sin cambios.
 *
 * Uso:
 *   ADMIN_EMAIL=vos@ejemplo.com ADMIN_PASSWORD=algo-seguro npx tsx src/db/seed-admin.ts
 *
 * Idempotente: si el email ya existe, no hace nada (no pisa la cuenta).
 */
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq } from "drizzle-orm";
import { db } from "./index";
import { account, user } from "./schema";

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Definí ADMIN_EMAIL y ADMIN_PASSWORD como variables de entorno.");
  }

  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) {
    console.log(`Ya existe un usuario con email ${email}, no se crea de nuevo.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const userId = randomUUID();

  await db.insert(user).values({
    id: userId,
    name: "Admin",
    email,
    emailVerified: true,
  });

  await db.insert(account).values({
    id: randomUUID(),
    userId,
    providerId: "credential",
    accountId: userId,
    password: passwordHash,
  });

  console.log(`Admin creado: ${email}`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error creando el admin:", error);
    process.exit(1);
  });
