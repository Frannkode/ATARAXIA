import { notFound } from "next/navigation";
import { getCategoryById } from "@/db/queries/categories";
import { CategoryForm } from "@/components/admin/category-form";

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = await getCategoryById(id);

  if (!category) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Editar categoría</h1>
      <CategoryForm initialValues={{ id: category.id, name: category.name, slug: category.slug }} />
    </div>
  );
}
