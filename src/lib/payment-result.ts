import { sql } from "drizzle-orm";
import { db } from "@/db";
import { sendOrderStatusEmail } from "@/lib/email/send-order-email";

export type MercadoPagoPaymentStatus =
  | "approved"
  | "rejected"
  | "pending"
  | "in_process"
  | "cancelled"
  | "refunded"
  | "charged_back";

export type OrderTerminalStatus = "pagado" | "rechazado";
type OrderStatus = OrderTerminalStatus | "en_proceso";

function mapToOrderStatus(mpStatus: MercadoPagoPaymentStatus): OrderStatus | null {
  switch (mpStatus) {
    case "approved":
      return "pagado";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "rechazado";
    case "pending":
    case "in_process":
      return "en_proceso";
    default:
      return null;
  }
}

// "rejected"/"cancelled" son la resolución ORIGINAL de UN intento de pago —
// una señal tardía/duplicada de esto sobre una orden ya 'pagado' es una
// duplicación/carrera, no una reversión real (Sprint 3: debe ser no-op).
// "refunded"/"charged_back" son eventos POSTERIORES que sí revierten un pago
// ya aprobado (Historia 5.3.1) — 'pagado' debe seguir abierto a esta
// transición específica, aunque no a un "rejected" tardío del mismo intento.
function isReversalOfCompletedPayment(mpStatus: MercadoPagoPaymentStatus): boolean {
  return mpStatus === "refunded" || mpStatus === "charged_back";
}

export interface ApplyPaymentResultOutcome {
  applied: boolean;
  newStatus: OrderStatus | null;
}

/**
 * Aplica el resultado de un pago a una orden — compartida entre el webhook
 * (Historia 3.2) y el cron de reconciliación (Historia 3.3), para no
 * duplicar la lógica de transición de estado + liberación de stock.
 *
 * Idempotente ante ejecuciones concurrentes (webhook y cron casi al mismo
 * tiempo, o el cron corriendo dos veces): pagado/rechazado son los únicos
 * estados terminales — pendiente_pago Y en_proceso siguen abiertos a una
 * resolución final. Si la orden ya está en un estado terminal, no hace nada.
 *
 * La transición de estado y la liberación de stock (si corresponde) van en
 * UN SOLO statement SQL con una CTE: la segunda UPDATE se ata al resultado
 * de la primera vía `RETURNING`, no a una relectura en vivo de orders.status
 * — dos UPDATEs separados en el mismo db.batch() no sirven acá porque el
 * segundo vería el status YA cambiado por el primero (misma transacción).
 */
export async function applyPaymentResult(
  orderId: string,
  mpStatus: MercadoPagoPaymentStatus,
): Promise<ApplyPaymentResultOutcome> {
  const newStatus = mapToOrderStatus(mpStatus);
  if (!newStatus) {
    return { applied: false, newStatus: null };
  }

  let applied: boolean;

  if (newStatus === "rechazado") {
    // El guard depende de SI este mpStatus es una reversión de un pago ya
    // completo (refunded/charged_back → 'pagado' sigue abierto a esto) o la
    // resolución original de un intento (rejected/cancelled → una señal
    // tardía/duplicada sobre una orden ya 'pagado' es no-op, como en Sprint 3).
    const isReversal = isReversalOfCompletedPayment(mpStatus);
    const orderGuard = isReversal
      ? sql`status != 'rechazado'`
      : sql`status NOT IN ('pagado', 'rechazado')`;

    // Historia 5.3.1: si la orden ya se despachó/entregó, la transición a
    // rechazado se aplica igual (el pago sí se revirtió — chargeback,
    // reembolso), pero NO se libera stock — la mercadería ya salió, liberar
    // stock acá sería fantasma. El chequeo de shipping_status vive en el
    // filtro de la 2da CTE, no en el guard de la transición de orders.
    //
    // El "applied" final sale de un SELECT separado sobre updated_order, no
    // del rowCount del UPDATE de products — si el pedido ya estaba
    // despachado, ese UPDATE afecta 0 filas a propósito (no es lo mismo que
    // "la transición de estado no se aplicó").
    const result = await db.execute<{ order_updated_count: number }>(sql`
      WITH updated_order AS (
        UPDATE orders SET status = 'rechazado', updated_at = now()
        WHERE id = ${orderId} AND ${orderGuard}
        RETURNING id, shipping_status
      ),
      stock_released AS (
        UPDATE products
        SET stock = stock + order_items.quantity
        FROM order_items
        WHERE order_items.order_id IN (
          SELECT id FROM updated_order WHERE shipping_status NOT IN ('despachado', 'entregado')
        )
          AND order_items.product_id = products.id
        RETURNING products.id
      )
      SELECT (SELECT count(*)::int FROM updated_order) AS order_updated_count
    `);
    applied = (result.rows[0]?.order_updated_count ?? 0) > 0;
  } else {
    const result = await db.execute(sql`
      UPDATE orders SET status = ${newStatus}, updated_at = now()
      WHERE id = ${orderId} AND status NOT IN ('pagado', 'rechazado')
    `);
    applied = (result.rowCount ?? 0) > 0;
  }

  // Email no bloqueante (Historia 3.4): una falla se loggea, nunca revierte
  // ni demora la respuesta al webhook/cron. Solo dispara si ESTA llamada fue
  // la que efectivamente causó la transición (evita reenviar el mismo email
  // si el guard rechazó la actualización por ya estar en estado terminal).
  if (applied && (newStatus === "pagado" || newStatus === "rechazado")) {
    void sendOrderStatusEmail(orderId, newStatus).catch((error: unknown) => {
      console.error("applyPaymentResult: falló el envío de email", orderId, error);
    });
  }

  return { applied, newStatus };
}
