import { CategoryForm } from "@/components/admin/category-form";

export default function NewCategoryPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Nueva categoría</h1>
      <CategoryForm initialValues={{ name: "", slug: "" }} />
    </div>
  );
}
