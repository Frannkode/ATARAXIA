import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { paymentClient } from "@/lib/mercadopago";
import { applyPaymentResult, type MercadoPagoPaymentStatus } from "@/lib/payment-result";

// Backstop del webhook (Historia 3.2): dado que el proyecto corre en Vercel
// Hobby (cron nativo solo diario, insuficiente), esta ruta la dispara un
// cron EXTERNO gratuito (cron-job.org) cada 15 min, autenticado con
// CRON_SECRET como bearer token — no es invocable como Server Action porque
// el caller es un servicio externo, no esta app.
export const dynamic = "force-dynamic";

const EXPIRATION_MINUTES = 30;

async function reconcileOrder(orderId: string): Promise<boolean> {
  try {
    const search = await paymentClient.search({
      options: { external_reference: orderId, sort: "date_created", criteria: "desc" },
    });
    const latestPaymentStatus = search.results?.[0]?.status;

    // Sin ningún pago asociado: el comprador nunca llegó a completar el pago
    // en MercadoPago (o abandonó antes de redirigirse) — se trata como
    // abandonado y se libera el stock reservado.
    const mpStatus = (latestPaymentStatus ?? "rejected") as MercadoPagoPaymentStatus;

    await applyPaymentResult(orderId, mpStatus);
    return true;
  } catch (error) {
    console.error("cron expire-orders: falló reconciliando la orden", orderId, error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - EXPIRATION_MINUTES * 60_000);

  const staleOrders = await db.query.orders.findMany({
    where: (order, { and, or, eq, lt }) =>
      and(
        or(eq(order.status, "pendiente_pago"), eq(order.status, "en_proceso")),
        lt(order.createdAt, cutoff),
      ),
  });

  let reconciled = 0;
  for (const order of staleOrders) {
    const ok = await reconcileOrder(order.id);
    if (ok) reconciled++;
  }

  return NextResponse.json({ ok: true, checked: staleOrders.length, reconciled });
}
