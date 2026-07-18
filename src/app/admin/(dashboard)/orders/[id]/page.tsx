import { notFound } from "next/navigation";
import { getOrderById } from "@/db/queries/orders";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status-labels";
import { ShippingStatusSelect } from "@/components/admin/shipping-status-select";
import { OverrideOrderStatusForm } from "@/components/admin/override-order-status-form";

export default async function AdminOrderDetailPage({
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
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Pedido {order.id.slice(0, 8)}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(order.createdAt).toLocaleString("es-AR")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-lg border border-border p-4">
        <div>
          <p className="text-xs text-muted-foreground">Estado de pago</p>
          <p className="font-medium text-foreground">{ORDER_STATUS_LABEL[order.status]}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Estado de envío</p>
          {order.status === "pagado" ? (
            <ShippingStatusSelect orderId={order.id} currentStatus={order.shippingStatus} />
          ) : (
            <p className="text-sm text-muted-foreground">— (pedido no pagado)</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Datos del comprador</p>
        <p className="text-sm text-foreground">{order.customerName}</p>
        <p className="text-sm text-muted-foreground">{order.customerEmail}</p>
        <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
        <p className="text-sm text-muted-foreground">{order.shippingAddress}</p>
      </div>

      <div className="rounded-lg border border-border p-4">
        <p className="mb-2 text-sm font-medium text-foreground">Productos</p>
        <ul className="flex flex-col gap-2">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-foreground">
                {item.productName} × {item.quantity}
              </span>
              <span className="text-foreground">{formatPrice(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
          <span className="font-semibold text-foreground">Total</span>
          <span className="font-semibold text-foreground">{formatPrice(order.subtotal)}</span>
        </div>
      </div>

      <OverrideOrderStatusForm orderId={order.id} currentStatus={order.status} />
    </div>
  );
}
