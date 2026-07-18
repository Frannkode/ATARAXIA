import Link from "next/link";
import { Suspense } from "react";
import { getCategories } from "@/db/queries/categories";
import { Button } from "@/components/ui/button";
import { DeleteCategoryButton } from "@/components/admin/delete-category-button";
import { ToastOnParam } from "@/components/admin/toast-on-param";

export default async function AdminCategoriesPage() {
  const categoryList = await getCategories();

  return (
    <div>
      <Suspense fallback={null}>
        <ToastOnParam />
      </Suspense>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Categorías</h1>
        <Button asChild>
          <Link href="/admin/categories/new">Nueva categoría</Link>
        </Button>
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {categoryList.map((category) => (
          <div key={category.id} className="flex items-center justify-between px-4 py-3">
            <Link href={`/admin/categories/${category.id}`} className="flex flex-col hover:underline">
              <span className="font-medium text-foreground">{category.name}</span>
              <span className="text-sm text-muted-foreground">{category.slug}</span>
            </Link>
            <DeleteCategoryButton categoryId={category.id} name={category.name} slug={category.slug} />
          </div>
        ))}
        {categoryList.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Todavía no hay categorías cargadas.
          </p>
        )}
      </div>
    </div>
  );
}
