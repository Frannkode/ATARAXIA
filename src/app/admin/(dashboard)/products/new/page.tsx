import { getCategories } from "@/db/queries/categories";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  const categories = await getCategories();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Nuevo producto</h1>
      <ProductForm
        categories={categories}
        initialValues={{
          name: "",
          slug: "",
          description: "",
          sku: "",
          retailPrice: "",
          wholesalePrice: "",
          wholesaleMinQty: "",
          stock: "0",
          categoryId: "",
          images: [],
          active: true,
        }}
      />
    </div>
  );
}
