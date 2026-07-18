import Link from "next/link";
import { getOrdersForAdmin } from "@/db/queries/orders";
import { formatPrice } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/order-status-labels";

const STATUS_FILTERS = ["pendiente_pago", "pagado", "rechazado", "en_proceso"] as const;

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const validStatus = STATUS_FILTERS.find((s) => s === status);
  const orderList = await getOrdersForAdmin({ status: validStatus });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Pedidos</h1>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/admin/orders"
          className={`rounded-full px-3 py-1 text-sm ${!validStatus ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
        >
          Todos
        </Link>
        {STATUS_FILTERS.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
            className={`rounded-full px-3 py-1 text-sm ${validStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            {ORDER_STATUS_LABEL[s]}
          </Link>
        ))}
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {orderList.map((order) => (
          <Link
            key={order.id}
            href={`/admin/orders/${order.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-muted"
          >
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {order.customerName}
                {order.status === "rechazado" && (
                  <span className="ml-2 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-normal text-destructive">
                    Rechazado
                  </span>
                )}
              </span>
              <span className="text-sm text-muted-foreground">
                {order.id.slice(0, 8)} · {new Date(order.createdAt).toLocaleDateString("es-AR")} ·{" "}
                {ORDER_STATUS_LABEL[order.status]}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">{formatPrice(order.subtotal)}</span>
          </Link>
        ))}
        {orderList.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No hay pedidos con este filtro.
          </p>
        )}
      </div>
    </div>
  );
}
