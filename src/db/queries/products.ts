import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export const PRODUCTS_PER_PAGE = 12;
const MAX_LIMIT = 48;

export interface GetProductsOptions {
  page?: number;
  limit?: number;
}

export async function getProducts({
  page = 1,
  limit = PRODUCTS_PER_PAGE,
}: GetProductsOptions = {}) {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeLimit =
    Number.isFinite(limit) && limit > 0
      ? Math.min(Math.floor(limit), MAX_LIMIT)
      : PRODUCTS_PER_PAGE;
  const offset = (safePage - 1) * safeLimit;

  const [rows, totalRows] = await Promise.all([
    db.query.products.findMany({
      where: (product, { eq }) => eq(product.active, true),
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
    db.select({ value: count() }).from(products).where(eq(products.active, true)),
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
