import { notFound } from "next/navigation";
import { getCategories } from "@/db/queries/categories";
import { getProductByIdForAdmin } from "@/db/queries/products";
import { ProductForm } from "@/components/admin/product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([getProductByIdForAdmin(id), getCategories()]);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Editar producto</h1>
      <ProductForm
        categories={categories}
        initialValues={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description ?? "",
          sku: product.sku,
          retailPrice: product.retailPrice,
          wholesalePrice: product.wholesalePrice ?? "",
          wholesaleMinQty: product.wholesaleMinQty != null ? String(product.wholesaleMinQty) : "",
          stock: String(product.stock),
          categoryId: product.categoryId ?? "",
          images: product.images.map((image) => ({ url: image.url })),
          active: product.active,
        }}
      />
    </div>
  );
}
