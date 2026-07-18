import { and, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { isValidUuid } from "@/lib/uuid";

export async function getOrderById(id: string) {
  if (!isValidUuid(id)) return undefined;

  return db.query.orders.findFirst({
    where: (order, { eq }) => eq(order.id, id),
    with: {
      items: true,
    },
  });
}

export interface GetOrdersForAdminOptions {
  status?: "pendiente_pago" | "pagado" | "rechazado" | "en_proceso";
  dateFrom?: Date;
  dateTo?: Date;
}

// Panel admin (Historia 5.1) — a diferencia de getOrderById, esto es una
// lista con filtros. Sin filtro por defecto (a diferencia de products, las
// ordenes no tienen concepto de "visibilidad publica" que ocultar).
export async function getOrdersForAdmin({ status, dateFrom, dateTo }: GetOrdersForAdminOptions = {}) {
  return db.query.orders.findMany({
    where: (order, { eq }) =>
      and(
        status ? eq(order.status, status) : undefined,
        dateFrom ? gte(order.createdAt, dateFrom) : undefined,
        dateTo ? lte(order.createdAt, dateTo) : undefined,
      ),
    orderBy: (order, { desc }) => desc(order.createdAt),
    with: {
      items: true,
    },
  });
}

export async function getOrderByIdempotencyKey(idempotencyKey: string) {
  return db.query.orders.findFirst({
    where: (order, { eq }) => eq(order.idempotencyKey, idempotencyKey),
    with: {
      items: true,
    },
  });
}
