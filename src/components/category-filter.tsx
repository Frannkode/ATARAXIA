import Link from "next/link";
import { buildCatalogHref } from "@/lib/catalog-url";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  slug: string;
}

const chipClass = (active: boolean) =>
  cn(
    "rounded-full border px-4 py-1.5 text-sm transition-colors",
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border text-muted-foreground hover:border-primary hover:text-foreground",
  );

export function CategoryFilter({
  categories,
  activeCategoryId,
  search,
}: {
  categories: Category[];
  activeCategoryId?: string;
  search?: string;
}) {
  if (categories.length === 0) return null;

  return (
    <nav aria-label="Filtrar por categoría" className="mb-6 flex flex-wrap gap-2">
      <Link href={buildCatalogHref({ search })} className={chipClass(!activeCategoryId)}>
        Todas
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={buildCatalogHref({ categoryId: category.id, search })}
          className={chipClass(activeCategoryId === category.id)}
        >
          {category.name}
        </Link>
      ))}
    </nav>
  );
}
