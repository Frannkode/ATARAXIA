import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isValidUuid } from "@/lib/uuid";

export const PRODUCTS_PER_PAGE = 12;
const MAX_LIMIT = 48;

export interface GetProductsOptions {
  page?: number;
  limit?: number;
  categoryId?: string;
}

export async function getProducts({
  page = 1,
  limit = PRODUCTS_PER_PAGE,
  categoryId,
}: GetProductsOptions = {}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit =
    Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), MAX_LIMIT)
      : PRODUCTS_PER_PAGE;
  const offset = (safePage - 1) * safeLimit;
  // Un categoryId con formato invalido (URL manipulada a mano) se ignora en
  // vez de romper la query contra la columna uuid.
  const safeCategoryId = isValidUuid(categoryId) ? categoryId : undefined;

  const countWhere = safeCategoryId
    ? and(eq(products.active, true), eq(products.categoryId, safeCategoryId))
    : eq(products.active, true);

  const [rows, totalRows] = await Promise.all([
    db.query.products.findMany({
      where: (product, { eq, and }) =>
        safeCategoryId
          ? and(eq(product.active, true), eq(product.categoryId, safeCategoryId))
          : eq(product.active, true),
      orderBy: (product, { desc }) => desc(product.createdAt),
      limit: safeLimit,
      offset,
      with: {
        category: true,
        images: {
          orderBy: (image, { asc }) => asc(image.position),
        },
      },
    }),
    db.select({ value: count() }).from(products).where(countWhere),
  ]);

  const total = totalRows[0]?.value ?? 0;

  return {
    products: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
    categoryId: safeCategoryId,
  };
}

export type ProductWithRelations = Awaited<ReturnType<typeof getProducts>>["products"][number];

export async function getProductById(id: string) {
  return db.query.products.findFirst({
    where: (product, { eq }) => eq(product.id, id),
    with: {
      category: true,
      images: {
        orderBy: (image, { asc }) => asc(image.position),
      },
    },
  });
}
