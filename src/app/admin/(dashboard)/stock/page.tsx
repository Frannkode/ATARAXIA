import { getAllProductsForAdmin } from "@/db/queries/products";
import { StockAdjuster } from "@/components/admin/stock-adjuster";

const LOW_STOCK_THRESHOLD = 5;

export default async function AdminStockPage() {
  const productList = await getAllProductsForAdmin();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Stock</h1>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {productList.map((product) => {
          const isOutOfStock = product.stock === 0;
          const isLowStock = !isOutOfStock && product.stock <= LOW_STOCK_THRESHOLD;

          return (
            <div key={product.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{product.name}</span>
                <span className="text-sm text-muted-foreground">{product.sku}</span>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`text-sm font-medium ${
                    isOutOfStock
                      ? "text-destructive"
                      : isLowStock
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-foreground"
                  }`}
                >
                  {isOutOfStock ? "Agotado" : isLowStock ? `${product.stock} (bajo)` : product.stock}
                </span>
                <StockAdjuster productId={product.id} />
              </div>
            </div>
          );
        })}
        {productList.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Todavía no hay productos cargados.
          </p>
        )}
      </div>
    </div>
  );
}
