import { and, count, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { orderRateLimitAttempts } from "@/db/schema";

const WINDOW_MINUTES = 10;
const MAX_ATTEMPTS_PER_WINDOW = 5;

/**
 * Ventana deslizante simple contra un solo vector: un guest checkout sin
 * gate de pago (Sprint 3) scripteado para vaciar stock real (ver /review de
 * Historia 2.4). No pretende parar un atacante distribuido con muchas IPs,
 * solo el caso simple/directo.
 *
 * Devuelve true si la IP puede intentar crear una orden ahora, y en ese caso
 * ya registra el intento (falla cerrado a "sí puede" si la IP no se pudo
 * determinar, ver getClientIp en orders.ts).
 */
export async function tryConsumeOrderAttempt(ipAddress: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - WINDOW_MINUTES * 60_000);

  // Housekeeping oportunista: sin esto la tabla crece indefinidamente. No hace
  // falta un cron aparte para un volumen de intentos de checkout de este tamaño.
  await db.delete(orderRateLimitAttempts).where(lt(orderRateLimitAttempts.createdAt, cutoff));

  const [row] = await db
    .select({ value: count() })
    .from(orderRateLimitAttempts)
    .where(
      and(eq(orderRateLimitAttempts.ipAddress, ipAddress), gte(orderRateLimitAttempts.createdAt, cutoff)),
    );

  if ((row?.value ?? 0) >= MAX_ATTEMPTS_PER_WINDOW) {
    return false;
  }

  await db.insert(orderRateLimitAttempts).values({ ipAddress });
  return true;
}
