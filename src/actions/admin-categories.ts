"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { type CategoryFormValues, categorySchema } from "@/lib/category-schema";
import { getPostgresErrorCode } from "@/lib/db-errors";
import { requireAdminSession } from "@/lib/require-admin-session";

export interface CategoryActionResult {
  success: boolean;
  categoryId?: string;
  error?: string;
}

// redirect() server-side en vez de que el cliente llame a router.push() tras
// el await: evita un bug conocido de Next.js/Turbopack en dev (HMR corriendo
// antes de que el router esté listo, ver github.com/vercel/next.js#71974)
// que deja el botón colgado en "Guardando..." aunque la mutación ya haya
// terminado bien.
export async function createCategory(
  values: CategoryFormValues,
): Promise<CategoryActionResult | never> {
  await requireAdminSession();

  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const [created] = await db.insert(categories).values(parsed.data).returning();
    if (!created) throw new Error("No se pudo crear la categoría.");
  } catch (error) {
    if (getPostgresErrorCode(error) === "23505") {
      return { success: false, error: "Ya existe una categoría con ese slug." };
    }
    console.error("createCategory: fallo inesperado", error);
    return { success: false, error: "No pudimos crear la categoría. Probá de nuevo." };
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories?toast=category-created");
}

export async function updateCategory(
  categoryId: string,
  values: CategoryFormValues,
): Promise<CategoryActionResult | never> {
  await requireAdminSession();

  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    const [updated] = await db
      .update(categories)
      .set(parsed.data)
      .where(eq(categories.id, categoryId))
      .returning();

    if (!updated) {
      return { success: false, error: "Categoría no encontrada." };
    }
  } catch (error) {
    if (getPostgresErrorCode(error) === "23505") {
      return { success: false, error: "Ya existe una categoría con ese slug." };
    }
    console.error("updateCategory: fallo inesperado", error);
    return { success: false, error: "No pudimos guardar los cambios. Probá de nuevo." };
  }

  revalidatePath("/admin/categories");
  redirect("/admin/categories?toast=category-updated");
}

export async function deleteCategory(categoryId: string): Promise<CategoryActionResult> {
  await requireAdminSession();

  // Solo cuentan los productos ACTIVOS: uno ya soft-deleted no debe bloquear
  // el borrado de la categoría (decisión del /plan-eng-review de Sprint 4).
  const [activeProduct] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.categoryId, categoryId), eq(products.active, true)))
    .limit(1);

  if (activeProduct) {
    return {
      success: false,
      error: "No se puede borrar: todavía hay productos activos en esta categoría.",
    };
  }

  const [deleted] = await db.delete(categories).where(eq(categories.id, categoryId)).returning();
  if (!deleted) {
    return { success: false, error: "Categoría no encontrada." };
  }

  return { success: true, categoryId };
}
