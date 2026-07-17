"use server";

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { getOrderByIdempotencyKey } from "@/db/queries/orders";
import { getProductsByIds } from "@/db/queries/products";
import { tryConsumeOrderAttempt } from "@/db/queries/rate-limit";
import { orderItems, orders, products } from "@/db/schema";
import type { CartItem } from "@/lib/cart-store";
import { validateCartItems } from "@/lib/cart-validation";
import { checkoutSchema, type CheckoutFormValues } from "@/lib/checkout-schema";
import { getClientIp } from "@/lib/client-ip";
import { getPostgresErrorCode } from "@/lib/db-errors";
import { calculateLineItem } from "@/lib/pricing";

export interface CreateOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
}

export async function createOrder(
  formValues: CheckoutFormValues,
  cartItems: CartItem[],
): Promise<CreateOrderResult> {
  const parsed = checkoutSchema.safeParse(formValues);
  if (!parsed.success) {
    return { success: false, error: "Datos de checkout inválidos." };
  }

  // Idempotencia: si ya existe una orden con esta key (doble submit, retry de
  // red), se devuelve la orden ya creada en vez de generar una segunda. Va
  // ANTES del rate limit para no penalizar un retry legítimo del mismo pedido.
  const existing = await getOrderByIdempotencyKey(parsed.data.idempotencyKey);
  if (existing) {
    return { success: true, orderId: existing.id };
  }

  // Rate limit (hallazgo de /review, Historia 2.4): checkout de invitado sin
  // gate de pago hasta Sprint 3 + descuento de stock inmediato es un vector de
  // agotamiento de inventario sin esto. Ver src/db/queries/rate-limit.ts.
  const clientIp = await getClientIp();
  const canAttempt = await tryConsumeOrderAttempt(clientIp);
  if (!canAttempt) {
    return {
      success: false,
      error: "Demasiados intentos. Esperá unos minutos antes de volver a intentar.",
    };
  }

  if (cartItems.length === 0) {
    return { success: false, error: "El carrito está vacío." };
  }

  // Revalidar server-side: nunca confiar en lo que mandó el cliente sobre
  // qué productos/cantidades son válidos.
  const dbProducts = await getProductsByIds(cartItems.map((item) => item.productId));
  const validated = validateCartItems(cartItems, dbProducts);

  if (validated.some((item) => !item.valid)) {
    return {
      success: false,
      error: "Alguno de los productos en tu carrito ya no está disponible.",
    };
  }

  const lineItems = validated.map((item) => ({
    item,
    price: calculateLineItem(item.product!, item.quantity),
  }));
  const subtotal = lineItems.reduce((sum, { price }) => sum + price.lineTotal, 0);

  // Generado acá (no dejado en manos de defaultRandom() de la DB) porque
  // db.batch() no permite leer el resultado de un insert para usarlo en la
  // siguiente query del mismo batch — todas las queries se arman de antemano.
  const orderId = randomUUID();

  const stockUpdates = lineItems.map(({ item }) =>
    db
      .update(products)
      .set({ stock: sql`${products.stock} - ${item.quantity}` })
      .where(eq(products.id, item.productId)),
  );

  const orderInsert = db.insert(orders).values({
    id: orderId,
    idempotencyKey: parsed.data.idempotencyKey,
    customerName: parsed.data.name,
    customerEmail: parsed.data.email,
    customerPhone: parsed.data.phone,
    shippingAddress: parsed.data.address,
    subtotal: subtotal.toFixed(2),
  });

  const orderItemsInsert = db.insert(orderItems).values(
    lineItems.map(({ item, price }) => ({
      orderId,
      productId: item.productId,
      productName: item.product!.name,
      unitPrice: price.unitPrice.toFixed(2),
      quantity: item.quantity,
      lineTotal: price.lineTotal.toFixed(2),
    })),
  );

  try {
    // db.batch ejecuta todas las queries como UNA transacción real de
    // Postgres vía el driver HTTP de Neon (drizzle-orm/neon-http NO soporta
    // db.transaction() — ver nota en el commit). Si el UPDATE de stock de
    // algún item viola el constraint `stock_non_negative`, TODO el batch se
    // revierte: los updates de stock de los demás items y los inserts de la
    // orden no quedan aplicados a medias.
    await db.batch([stockUpdates[0]!, ...stockUpdates.slice(1), orderInsert, orderItemsInsert]);
    return { success: true, orderId };
  } catch (error) {
    // 23514 = check_violation (Postgres/SQLSTATE): el UPDATE de stock chocó
    // contra stock_non_negative, o sea, no había stock suficiente. Cualquier
    // otro error es un problema real (red, bug, etc.) y no debe disfrazarse
    // de "sin stock" — eso escondería bugs en vez de mostrarlos.
    const errorCode = getPostgresErrorCode(error);

    if (errorCode === "23514") {
      return {
        success: false,
        error:
          "No había stock suficiente para completar el pedido. Volvé al carrito y revisá las cantidades.",
      };
    }

    // 23505 = unique_violation: el chequeo de idempotencia de arriba (SELECT)
    // y este INSERT no son atómicos entre sí — dos submits concurrentes con
    // la misma idempotencyKey (doble-click muy rápido, retry de red) pueden
    // pasar ambos el chequeo "no existe" antes de que cualquiera inserte.
    // El que pierde la carrera cae acá: en vez de fallarle al usuario que en
    // realidad SÍ generó su pedido (por la otra request concurrente), se
    // busca y devuelve esa orden — el propósito de tener la key es justo que
    // esto sea indistinguible de "ya existía" para quien la usa.
    if (errorCode === "23505") {
      const raceWinner = await getOrderByIdempotencyKey(parsed.data.idempotencyKey);
      if (raceWinner) {
        return { success: true, orderId: raceWinner.id };
      }
    }

    console.error("createOrder: fallo inesperado", error);
    return {
      success: false,
      error: "No pudimos generar tu pedido. Probá de nuevo en unos segundos.",
    };
  }
}
