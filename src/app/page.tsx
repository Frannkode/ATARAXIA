import { CategoryFilter } from "@/components/category-filter";
import { PaginationControls } from "@/components/pagination-controls";
import { ProductCard } from "@/components/product-card";
import { SearchInput } from "@/components/search-input";
import { getCategories } from "@/db/queries/categories";
import { getProducts } from "@/db/queries/products";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; categoryId?: string; search?: string }>;
}) {
  const { page: pageParam, categoryId, search } = await searchParams;
  const requestedPage = Number(pageParam) || 1;

  const [categories, result] = await Promise.all([
    getCategories(),
    getProducts({ page: requestedPage, categoryId, search }),
  ]);

  const { products, pagination, categoryId: activeCategoryId, search: activeSearch } = result;

  let emptyMessage: string | null = null;
  if (pagination.total === 0) {
    if (activeSearch) {
      emptyMessage = `No encontramos productos que coincidan con "${activeSearch}".`;
    } else if (activeCategoryId) {
      emptyMessage = "No hay productos en esta categoría todavía.";
    } else {
      emptyMessage = "Todavía no hay productos cargados.";
    }
  } else if (products.length === 0) {
    emptyMessage = "No hay productos en esta página.";
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Catálogo</h1>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput initialValue={activeSearch} categoryId={activeCategoryId} />
      </div>

      <CategoryFilter
        categories={categories}
        activeCategoryId={activeCategoryId}
        search={activeSearch}
      />

      {emptyMessage ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <PaginationControls
        page={pagination.page}
        totalPages={pagination.totalPages}
        categoryId={activeCategoryId}
        search={activeSearch}
      />
    </main>
  );
}
