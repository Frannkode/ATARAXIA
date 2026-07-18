import { getOrderById } from "@/db/queries/orders";
import { resend } from "@/lib/email/resend-client";
import { PaymentApprovedEmail } from "@/lib/email/templates/payment-approved";
import { PaymentRejectedEmail } from "@/lib/email/templates/payment-rejected";
import type { OrderTerminalStatus } from "@/lib/payment-result";
import { getSiteUrl } from "@/lib/site-url";

// onboarding@resend.dev: remitente de sandbox de Resend, funciona sin
// verificar dominio propio — el cliente todavía no proveyó uno (ver
// Context/Preguntas-Cliente.md, "Antes del Sprint 3"). Reemplazar cuando
// haya un dominio verificado.
const FROM_ADDRESS = "KODE <onboarding@resend.dev>";

/**
 * Dispara el email transaccional correspondiente al estado final de un
 * pedido. Se llama desde applyPaymentResult de forma no bloqueante — una
 * falla acá se loggea pero nunca revierte ni bloquea la actualización del
 * pedido que ya se aplicó.
 */
export async function sendOrderStatusEmail(orderId: string, status: OrderTerminalStatus): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) return;

  const orderUrl = `${getSiteUrl()}/pedidos/${orderId}`;

  if (status === "pagado") {
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: order.customerEmail,
      subject: `Tu pago fue aprobado — pedido #${orderId.slice(0, 8)}`,
      react: PaymentApprovedEmail({
        orderId,
        customerName: order.customerName,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
        subtotal: order.subtotal,
        orderUrl,
      }),
    });
    return;
  }

  await resend.emails.send({
    from: FROM_ADDRESS,
    to: order.customerEmail,
    subject: `No pudimos procesar tu pago — pedido #${orderId.slice(0, 8)}`,
    react: PaymentRejectedEmail({ orderId, customerName: order.customerName, orderUrl }),
  });
}
