import { sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { getOrderById } from "@/db/queries/orders";
import { getPostgresErrorCode } from "@/lib/db-errors";

export type OrderStatus = "pendiente_pago" | "pagado" | "rechazado" | "en_proceso";

export interface OverrideOrderStatusResult {
  success: boolean;
  error?: string;
}

function buildStockAdjustmentCte(direction: "release" | "reserve"): SQL {
  const operator = direction === "release" ? sql.raw("+") : sql.raw("-");
  return sql`,
    stock_adjusted AS (
      UPDATE products
      SET stock = stock ${operator} order_items.quantity
      FROM order_items
      WHERE order_items.order_id IN (SELECT id FROM updated_order)
        AND order_items.product_id = products.id
      RETURNING products.id
    )`;
}

/**
 * Override manual de estado de pago (Historia 5.3) — comparte el MECANISMO
 * de CTE de un solo statement con applyPaymentResult (Sprint 3), pero NO su
 * guard: ese guard ('NOT IN (pagado, rechazado)') bloquearía justo los casos
 * para los que existe esta historia (corregir un pedido YA en un estado
 * terminal). Acá el guard es de concurrencia optimista: solo aplica si el
 * estado sigue siendo el que se leyó recién (fromStatus), evitando pisar una
 * resolución automática (webhook/cron) más reciente que esa lectura.
 *
 * El insert en order_status_audit_log va DENTRO del mismo CTE atómico: si el
 * guard bloquea el UPDATE (0 filas), el insert de auditoría tampoco se
 * aplica — de lo contrario quedaría un registro de un cambio que nunca pasó.
 */
export async function overrideOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  changedByUserId: string,
  reason: string | undefined,
): Promise<OverrideOrderStatusResult> {
  const order = await getOrderById(orderId);
  if (!order) {
    return { success: false, error: "Pedido no encontrado." };
  }

  const fromStatus = order.status;
  if (fromStatus === newStatus) {
    return { success: false, error: "El pedido ya está en ese estado." };
  }

  const alreadyShipped = order.shippingStatus === "despachado" || order.shippingStatus === "entregado";
  // Historia 5.3.1: mismo criterio que applyPaymentResult — no liberar stock
  // fantasma si la mercadería ya salió.
  const releasingStock = newStatus === "rechazado" && fromStatus !== "rechazado" && !alreadyShipped;
  // Revertir un rechazo previo a pagado: hay que volver a descontar el
  // stock que se había liberado (si no alcanza, stock_non_negative rechaza
  // el statement entero — no se aprueba una venta sin stock real).
  const reservingStock = newStatus === "pagado" && fromStatus === "rechazado";

  const stockCte = releasingStock
    ? buildStockAdjustmentCte("release")
    : reservingStock
      ? buildStockAdjustmentCte("reserve")
      : sql``;

  try {
    const result = await db.execute<{ order_updated_count: number }>(sql`
      WITH updated_order AS (
        UPDATE orders SET status = ${newStatus}, updated_at = now()
        WHERE id = ${orderId} AND status = ${fromStatus}
        RETURNING id
      )${stockCte},
      audit_logged AS (
        INSERT INTO order_status_audit_log (order_id, changed_by_user_id, from_status, to_status, reason)
        SELECT id, ${changedByUserId}, ${fromStatus}, ${newStatus}, ${reason ?? null} FROM updated_order
        RETURNING id
      )
      SELECT (SELECT count(*)::int FROM updated_order) AS order_updated_count
    `);

    const applied = (result.rows[0]?.order_updated_count ?? 0) > 0;
    if (!applied) {
      return {
        success: false,
        error: "El estado del pedido cambió mientras tanto. Recargá la página e intentá de nuevo.",
      };
    }
    return { success: true };
  } catch (error) {
    if (getPostgresErrorCode(error) === "23514") {
      return { success: false, error: "No hay stock suficiente para aprobar este pedido." };
    }
    console.error("overrideOrderStatus: fallo inesperado", error);
    return { success: false, error: "No pudimos cambiar el estado del pedido. Probá de nuevo." };
  }
}
