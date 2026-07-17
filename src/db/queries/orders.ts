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

export async function getOrderByIdempotencyKey(idempotencyKey: string) {
  return db.query.orders.findFirst({
    where: (order, { eq }) => eq(order.idempotencyKey, idempotencyKey),
    with: {
      items: true,
    },
  });
}
