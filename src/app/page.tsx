import { PaginationControls } from "@/components/pagination-controls";
import { ProductCard } from "@/components/product-card";
import { getProducts } from "@/db/queries/products";

export default async function Home({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const requestedPage = Number(pageParam) || 1;

  const { products, pagination } = await getProducts({ page: requestedPage });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Catálogo</h1>

      {pagination.total === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          Todavía no hay productos cargados.
        </p>
      ) : products.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          No hay productos en esta página.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <PaginationControls page={pagination.page} totalPages={pagination.totalPages} />
    </main>
  );
}
