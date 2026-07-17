import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { getOrderById } from "@/db/queries/orders";
import { processedMercadopagoPayments } from "@/db/schema";
import { getPostgresErrorCode } from "@/lib/db-errors";
import { paymentClient } from "@/lib/mercadopago";
import { applyPaymentResult, type MercadoPagoPaymentStatus } from "@/lib/payment-result";

// Route Handler llamado por los servidores de MercadoPago — no un flujo de
// UI, por eso no puede ser un Server Action (esos solo son invocables desde
// componentes de esta misma app via el protocolo RSC).
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const topic = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id");

  // MercadoPago manda notificaciones de "payment" Y de "merchant_order" al
  // mismo notification_url — solo la primera nos interesa. La segunda se
  // responde 200 sin reprocesar para no generar reintentos infinitos.
  if (topic !== "payment") {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Webhook MercadoPago: falta configurar MERCADOPAGO_WEBHOOK_SECRET");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  try {
    WebhookSignatureValidator.validate({
      xSignature: request.headers.get("x-signature"),
      xRequestId: request.headers.get("x-request-id"),
      dataId,
      secret,
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.error("Webhook MercadoPago: firma inválida", error.reason);
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
    throw error;
  }

  if (!dataId) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  let payment;
  try {
    // Nunca confiar en el payload del webhook: se consulta el pago real
    // contra la API de MercadoPago usando el access token propio.
    payment = await paymentClient.get({ id: dataId });
  } catch (error) {
    console.error("Webhook MercadoPago: fallo al consultar el pago", dataId, error);
    // 200 igual: si MercadoPago reintenta un pago que ya no existe o hay un
    // error transitorio de red, seguir reintentando no cambia el resultado.
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const orderId = payment.external_reference;
  const paymentStatus = payment.status as MercadoPagoPaymentStatus | undefined;

  if (!orderId || !paymentStatus) {
    console.error("Webhook MercadoPago: payment sin external_reference/status", dataId);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    console.error("Webhook MercadoPago: external_reference no corresponde a ningún pedido", orderId);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Idempotencia: un paymentId repetido (MercadoPago reintenta si no
  // responde 200 a tiempo) no debe reprocesarse. El unique constraint es la
  // fuente de verdad — no un SELECT previo, que reintroduciría el mismo
  // TOCTOU que la idempotencyKey de Historia 2.4 tuvo que resolver.
  try {
    await db.insert(processedMercadopagoPayments).values({
      paymentId: dataId,
      orderId,
      status: paymentStatus,
    });
  } catch (error) {
    if (getPostgresErrorCode(error) === "23505") {
      return NextResponse.json({ ok: true, deduped: true }, { status: 200 });
    }
    console.error("Webhook MercadoPago: fallo al registrar idempotencia", error);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }

  await applyPaymentResult(orderId, paymentStatus);

  return NextResponse.json({ ok: true }, { status: 200 });
}
