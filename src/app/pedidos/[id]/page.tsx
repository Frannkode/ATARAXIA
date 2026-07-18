import Link from "next/link";
import { notFound } from "next/navigation";
import { PayNowButton } from "@/components/pay-now-button";
import { getOrderById } from "@/db/queries/orders";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status-labels";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-2 text-2xl font-semibold text-foreground">¡Pedido recibido!</h1>
      <p className="mb-6 text-muted-foreground">
        Número de pedido: <span className="font-mono text-foreground">{order.id}</span>
      </p>

      <p className="mb-6 inline-block rounded-full bg-muted px-3 py-1 text-sm font-medium text-foreground">
        Estado: {ORDER_STATUS_LABEL[order.status] ?? order.status}
      </p>

      {order.status === "pendiente_pago" && (
        <div className="mb-6">
          <PayNowButton orderId={order.id} />
        </div>
      )}

      <ul className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between text-sm">
            <span className="text-foreground">
              {item.productName} × {item.quantity}
            </span>
            <span className="text-foreground">{formatPrice(item.lineTotal)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-lg font-semibold text-foreground">Total</span>
        <span className="text-lg font-semibold text-foreground">{formatPrice(order.subtotal)}</span>
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Enviamos la confirmación a <span className="text-foreground">{order.customerEmail}</span>.
      </p>

      <Link href="/" className="mt-8 inline-block text-sm text-foreground underline">
        Volver al catálogo
      </Link>
    </main>
  );
}
