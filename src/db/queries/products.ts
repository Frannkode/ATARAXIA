import { and, count, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { products } from "@/db/schema";
import { isValidUuid } from "@/lib/uuid";

export const PRODUCTS_PER_PAGE = 12;
const MAX_LIMIT = 48;

const searchSchema = z.string().trim().min(1).max(100);

function parseSearch(search: string | undefined) {
  const result = searchSchema.safeParse(search);
  return result.success ? result.data : undefined;
}

export interface GetProductsOptions {
  page?: number;
  limit?: number;
  categoryId?: string;
  search?: string;
}

export async function getProducts({
  page = 1,
  limit = PRODUCTS_PER_PAGE,
  categoryId,
  search,
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
  const safeSearch = parseSearch(search);

  const countWhere = and(
    eq(products.active, true),
    safeCategoryId ? eq(products.categoryId, safeCategoryId) : undefined,
    safeSearch
      ? or(ilike(products.name, `%${safeSearch}%`), ilike(products.description, `%${safeSearch}%`))
      : undefined,
  );

  const [rows, totalRows] = await Promise.all([
    db.query.products.findMany({
      where: (product, { eq, and, or, ilike }) =>
        and(
          eq(product.active, true),
          safeCategoryId ? eq(product.categoryId, safeCategoryId) : undefined,
          safeSearch
            ? or(
                ilike(product.name, `%${safeSearch}%`),
                ilike(product.description, `%${safeSearch}%`),
              )
            : undefined,
        ),
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
    search: safeSearch,
  };
}

export type ProductWithRelations = Awaited<ReturnType<typeof getProducts>>["products"][number];

// Para resolver el carrito: a diferencia de getProducts()/getProductById(),
// NO filtra por active. Necesita poder traer un producto desactivado para
// que validateCartItems tenga su nombre y pueda avisar "ya no disponible" en
// vez de mostrar un item fantasma sin info.
export async function getProductsByIds(ids: string[]) {
  const validIds = ids.filter(isValidUuid);
  if (validIds.length === 0) return [];

  return db.query.products.findMany({
    where: (product, { inArray }) => inArray(product.id, validIds),
    with: {
      category: true,
      images: {
        orderBy: (image, { asc }) => asc(image.position),
      },
    },
  });
}

export async function getProductById(id: string) {
  if (!isValidUuid(id)) return undefined;

  // Un producto desactivado (soft delete, Sprint 4) no debe ser accesible por
  // link directo: se trata igual que "no existe" de cara al público.
  return db.query.products.findFirst({
    where: (product, { eq, and }) => and(eq(product.id, id), eq(product.active, true)),
    with: {
      category: true,
      images: {
        orderBy: (image, { asc }) => asc(image.position),
      },
    },
  });
}
