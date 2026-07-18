"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { requireAdminSession } from "@/lib/require-admin-session";
import {
  type OrderStatus,
  type OverrideOrderStatusResult,
  overrideOrderStatus,
} from "@/lib/order-status-override";

export async function overrideOrderStatusAction(
  orderId: string,
  newStatus: OrderStatus,
  reason: string | undefined,
): Promise<OverrideOrderStatusResult> {
  const session = await requireAdminSession();

  const result = await overrideOrderStatus(orderId, newStatus, session.user.id, reason);
  if (result.success) {
    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath("/admin/orders");
  }
  return result;
}

export interface UpdateShippingStatusResult {
  success: boolean;
  error?: string;
}

type ShippingStatus = "preparando" | "despachado" | "entregado";

export async function updateShippingStatus(
  orderId: string,
  newShippingStatus: ShippingStatus,
): Promise<UpdateShippingStatusResult> {
  await requireAdminSession();

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) {
    return { success: false, error: "Pedido no encontrado." };
  }

  // No tiene sentido marcar "entregado" un pedido que no está pagado — bloqueado,
  // no solo advertido (Historia 5.2).
  if (newShippingStatus === "entregado" && order.status !== "pagado") {
    return {
      success: false,
      error: "No se puede marcar como entregado un pedido que no está pagado.",
    };
  }

  await db
    .update(orders)
    .set({ shippingStatus: newShippingStatus, updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");

  return { success: true };
}
