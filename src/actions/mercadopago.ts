"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { getOrderById } from "@/db/queries/orders";
import { orders } from "@/db/schema";
import { EXCLUDED_PAYMENT_TYPES, preferenceClient } from "@/lib/mercadopago";
import { getSiteUrl } from "@/lib/site-url";

export interface CreatePaymentPreferenceResult {
  success: boolean;
  initPoint?: string;
  error?: string;
}

async function tryReuseExistingPreference(preferenceId: string): Promise<string | null> {
  try {
    const existing = await preferenceClient.get({ preferenceId });
    return existing.init_point ?? null;
  } catch {
    // Vencida, borrada, o cualquier otro motivo por el que ya no sirve: se
    // ignora el error y el caller genera una preferencia nueva.
    return null;
  }
}

export async function createPaymentPreference(orderId: string): Promise<CreatePaymentPreferenceResult> {
  const order = await getOrderById(orderId);
  if (!order) {
    return { success: false, error: "Pedido no encontrado." };
  }

  // Solo pendiente_pago admite generar/reutilizar una preferencia: en_proceso
  // ya tiene un intento de pago bajo analisis (no tiene sentido arrancar otro
  // en paralelo), y pagado/rechazado ya son estados terminales.
  if (order.status !== "pendiente_pago") {
    return { success: false, error: "Este pedido ya no admite un nuevo intento de pago." };
  }

  if (order.mercadopagoPreferenceId) {
    const reusedInitPoint = await tryReuseExistingPreference(order.mercadopagoPreferenceId);
    if (reusedInitPoint) {
      return { success: true, initPoint: reusedInitPoint };
    }
  }

  const siteUrl = getSiteUrl();
  // MercadoPago rechaza auto_return si back_urls no es una URL https real —
  // localhost (desarrollo local sin tunel) no califica.
  const isLocalDev = siteUrl.startsWith("http://localhost");

  try {
    const preference = await preferenceClient.create({
      body: {
        items: order.items.map((item) => ({
          id: item.productId,
          title: item.productName,
          quantity: item.quantity,
          currency_id: "ARS",
          unit_price: Number(item.unitPrice),
        })),
        external_reference: order.id,
        back_urls: {
          success: `${siteUrl}/pedidos/${order.id}`,
          pending: `${siteUrl}/pedidos/${order.id}`,
          failure: `${siteUrl}/pedidos/${order.id}`,
        },
        ...(!isLocalDev && { auto_return: "approved" }),
        notification_url: `${siteUrl}/api/webhooks/mercadopago`,
        payment_methods: {
          excluded_payment_types: EXCLUDED_PAYMENT_TYPES,
        },
      },
    });

    if (!preference.id || !preference.init_point) {
      throw new Error("MercadoPago no devolvió un id/init_point válido");
    }

    await db
      .update(orders)
      .set({ mercadopagoPreferenceId: preference.id })
      .where(eq(orders.id, order.id));

    return { success: true, initPoint: preference.init_point };
  } catch (error) {
    console.error("createPaymentPreference: fallo al crear preferencia", error);
    return {
      success: false,
      error: "No pudimos generar el link de pago. Probá de nuevo en unos segundos.",
    };
  }
}
