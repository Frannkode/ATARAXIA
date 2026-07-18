"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { productImages, products } from "@/db/schema";
import { getPostgresErrorCode } from "@/lib/db-errors";
import { type ProductFormValues, productSchema } from "@/lib/product-schema";
import { requireAdminSession } from "@/lib/require-admin-session";

export interface ProductActionResult {
  success: boolean;
  productId?: string;
  error?: string;
}

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

async function replaceProductImages(productId: string, images: ProductFormValues["images"]) {
  await db.delete(productImages).where(eq(productImages.productId, productId));
  if (images.length === 0) return;

  await db.insert(productImages).values(
    images.map((image, index) => ({
      productId,
      url: image.url,
      position: index,
    })),
  );
}

// redirect() server-side en vez de que el cliente llame a router.push() tras
// el await: evita un bug conocido de Next.js/Turbopack en dev (HMR corriendo
// antes de que el router esté listo, ver github.com/vercel/next.js#71974)
// que deja el botón colgado en "Guardando..." aunque la mutación ya haya
// terminado bien.
export async function createProduct(
  values: ProductFormValues,
): Promise<ProductActionResult | never> {
  await requireAdminSession();

  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const [created] = await db
      .insert(products)
      .values({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        sku: parsed.data.sku,
        retailPrice: toDecimalString(parsed.data.retailPrice),
        wholesalePrice:
          parsed.data.wholesalePrice != null ? toDecimalString(parsed.data.wholesalePrice) : null,
        wholesaleMinQty: parsed.data.wholesaleMinQty ?? null,
        stock: parsed.data.stock,
        categoryId: parsed.data.categoryId || null,
      })
      .returning();

    if (!created) throw new Error("No se pudo crear el producto.");

    await replaceProductImages(created.id, parsed.data.images);
  } catch (error) {
    if (getPostgresErrorCode(error) === "23505") {
      return { success: false, error: "Ya existe un producto con ese slug o SKU." };
    }
    console.error("createProduct: fallo inesperado", error);
    return { success: false, error: "No pudimos crear el producto. Probá de nuevo." };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?toast=product-created");
}

export async function updateProduct(
  productId: string,
  values: ProductFormValues,
): Promise<ProductActionResult | never> {
  await requireAdminSession();

  const parsed = productSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const [updated] = await db
      .update(products)
      .set({
        name: parsed.data.name,
        slug: parsed.data.slug,
        description: parsed.data.description || null,
        sku: parsed.data.sku,
        retailPrice: toDecimalString(parsed.data.retailPrice),
        wholesalePrice:
          parsed.data.wholesalePrice != null ? toDecimalString(parsed.data.wholesalePrice) : null,
        wholesaleMinQty: parsed.data.wholesaleMinQty ?? null,
        stock: parsed.data.stock,
        categoryId: parsed.data.categoryId || null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId))
      .returning();

    if (!updated) {
      return { success: false, error: "Producto no encontrado." };
    }

    await replaceProductImages(productId, parsed.data.images);
  } catch (error) {
    if (getPostgresErrorCode(error) === "23505") {
      return { success: false, error: "Ya existe un producto con ese slug o SKU." };
    }
    console.error("updateProduct: fallo inesperado", error);
    return { success: false, error: "No pudimos guardar los cambios. Probá de nuevo." };
  }

  revalidatePath("/admin/products");
  redirect("/admin/products?toast=product-updated");
}

export async function setProductActive(
  productId: string,
  active: boolean,
): Promise<ProductActionResult> {
  await requireAdminSession();

  const [updated] = await db
    .update(products)
    .set({ active, updatedAt: new Date() })
    .where(eq(products.id, productId))
    .returning();

  if (!updated) {
    return { success: false, error: "Producto no encontrado." };
  }

  return { success: true, productId };
}
