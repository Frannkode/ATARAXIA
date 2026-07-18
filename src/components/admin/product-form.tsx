"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createProduct, setProductActive, updateProduct } from "@/actions/admin-products";
import { ImageUploader, type UploadedImage } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { productSchema } from "@/lib/product-schema";

export interface ProductFormInitialValues {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sku: string;
  retailPrice: string;
  wholesalePrice: string;
  wholesaleMinQty: string;
  stock: string;
  categoryId: string;
  images: UploadedImage[];
  active: boolean;
}

interface Category {
  id: string;
  name: string;
}

export function ProductForm({
  initialValues,
  categories,
}: {
  initialValues: ProductFormInitialValues;
  categories: Category[];
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialValues);
  const [images, setImages] = useState<UploadedImage[]>(initialValues.images);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = productSchema.safeParse({
      name: form.name,
      slug: form.slug,
      description: form.description,
      sku: form.sku,
      retailPrice: form.retailPrice,
      wholesalePrice: form.wholesalePrice === "" ? null : form.wholesalePrice,
      wholesaleMinQty: form.wholesaleMinQty === "" ? null : form.wholesaleMinQty,
      stock: form.stock,
      categoryId: form.categoryId === "" ? null : form.categoryId,
      images,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    startTransition(async () => {
      // Sin éxito devuelve {success:false, error}; con éxito redirige
      // server-side (redirect() en la action) y esta línea nunca vuelve.
      const result = form.id
        ? await updateProduct(form.id, parsed.data)
        : await createProduct(parsed.data);

      setError(result.error ?? "Algo salió mal.");
    });
  }

  function handleToggleActive() {
    if (!form.id) return;
    const productId = form.id;
    const goingInactive = form.active; // se va a desactivar en este toggle

    startTransition(async () => {
      await setProductActive(productId, !goingInactive);
      router.refresh();
      setForm((prev) => ({ ...prev, active: !prev.active }));

      // El "deshacer" de desactivar es simplemente reactivar — a diferencia
      // del borrado de categorías, esto SÍ es un undo real: mismo id, mismos
      // datos, sin pérdida.
      if (goingInactive) {
        toast.success(`"${form.name}" desactivado.`, {
          duration: 8000,
          action: {
            label: "Deshacer",
            onClick: () => {
              startTransition(async () => {
                await setProductActive(productId, true);
                router.refresh();
                setForm((prev) => ({ ...prev, active: true }));
              });
            },
          },
        });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Nombre
        </label>
        <Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="slug" className="text-sm font-medium text-foreground">
          Slug
        </label>
        <Input id="slug" value={form.slug} onChange={(e) => handleChange("slug", e.target.value)} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="description" className="text-sm font-medium text-foreground">
          Descripción
        </label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="sku" className="text-sm font-medium text-foreground">
          SKU
        </label>
        <Input id="sku" value={form.sku} onChange={(e) => handleChange("sku", e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="retailPrice" className="text-sm font-medium text-foreground">
            Precio minorista
          </label>
          <Input
            id="retailPrice"
            type="number"
            step="0.01"
            value={form.retailPrice}
            onChange={(e) => handleChange("retailPrice", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="stock" className="text-sm font-medium text-foreground">
            Stock
          </label>
          <Input
            id="stock"
            type="number"
            value={form.stock}
            onChange={(e) => handleChange("stock", e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="wholesalePrice" className="text-sm font-medium text-foreground">
            Precio mayorista (opcional)
          </label>
          <Input
            id="wholesalePrice"
            type="number"
            step="0.01"
            value={form.wholesalePrice}
            onChange={(e) => handleChange("wholesalePrice", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="wholesaleMinQty" className="text-sm font-medium text-foreground">
            Cantidad mínima mayorista
          </label>
          <Input
            id="wholesaleMinQty"
            type="number"
            value={form.wholesaleMinQty}
            onChange={(e) => handleChange("wholesaleMinQty", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="categoryId" className="text-sm font-medium text-foreground">
          Categoría
        </label>
        <select
          id="categoryId"
          value={form.categoryId}
          onChange={(e) => handleChange("categoryId", e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">Sin categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">Imágenes</span>
        <ImageUploader images={images} onChange={setImages} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="mt-2 flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
        {form.id && (
          <Button type="button" variant="outline" onClick={handleToggleActive} disabled={isPending}>
            {form.active ? "Desactivar" : "Reactivar"}
          </Button>
        )}
      </div>
    </form>
  );
}
