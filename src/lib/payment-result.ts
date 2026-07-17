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
    const result = await db.execute(sql`
      WITH updated_order AS (
        UPDATE orders SET status = 'rechazado', updated_at = now()
        WHERE id = ${orderId} AND status NOT IN ('pagado', 'rechazado')
        RETURNING id
      )
      UPDATE products
      SET stock = stock + order_items.quantity
      FROM order_items
      WHERE order_items.order_id IN (SELECT id FROM updated_order)
        AND order_items.product_id = products.id
    `);
    applied = (result.rowCount ?? 0) > 0;
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
