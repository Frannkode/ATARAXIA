import Link from "next/link";
import { Suspense } from "react";
import { getAllProductsForAdmin } from "@/db/queries/products";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ToastOnParam } from "@/components/admin/toast-on-param";

export default async function AdminProductsPage() {
  const productList = await getAllProductsForAdmin();

  return (
    <div>
      <Suspense fallback={null}>
        <ToastOnParam />
      </Suspense>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Productos</h1>
        <Button asChild>
          <Link href="/admin/products/new">Nuevo producto</Link>
        </Button>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {productList.map((product) => (
          <Link
            key={product.id}
            href={`/admin/products/${product.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-muted"
          >
            <div className="flex flex-col">
              <span className="font-medium text-foreground">
                {product.name}
                {!product.active && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                    Inactivo
                  </span>
                )}
              </span>
              <span className="text-sm text-muted-foreground">
                {product.sku} · {product.category?.name ?? "Sin categoría"} · Stock: {product.stock}
              </span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {formatPrice(product.retailPrice)}
            </span>
          </Link>
        ))}
        {productList.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Todavía no hay productos cargados.
          </p>
        )}
      </div>
    </div>
  );
}
