import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductWithRelations } from "@/db/queries/products";

const { getProductsByIds } = vi.hoisted(() => ({ getProductsByIds: vi.fn() }));

vi.mock("@/db/queries/products", () => ({ getProductsByIds }));

const { resolveCart } = await import("./cart");

function makeProduct(overrides: Partial<ProductWithRelations> = {}): ProductWithRelations {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Remera",
    slug: "remera",
    description: null,
    sku: "REM-001",
    retailPrice: "18000.00",
    wholesalePrice: "14000.00",
    wholesaleMinQty: 6,
    stock: 10,
    categoryId: null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: null,
    images: [],
    ...overrides,
  };
}

describe("resolveCart", () => {
  beforeEach(() => {
    getProductsByIds.mockReset();
  });

  it("carrito vacío: no llama a la base y devuelve subtotal 0", async () => {
    const result = await resolveCart([]);
    expect(result).toEqual({ items: [], subtotal: 0, hasInvalidItems: false });
    expect(getProductsByIds).not.toHaveBeenCalled();
  });

  it("suma el subtotal solo de los items válidos, ignorando los inválidos", async () => {
    const valid = makeProduct({ id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", stock: 10 });
    const sinStock = makeProduct({ id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", stock: 0 });
    getProductsByIds.mockResolvedValue([valid, sinStock]);

    const result = await resolveCart([
      { productId: valid.id, quantity: 2 },
      { productId: sinStock.id, quantity: 1 },
    ]);

    // Solo el item válido (2 * 18000 = 36000) entra al subtotal; el inválido
    // (sin stock) no debe sumar nada aunque tenga un precio real.
    expect(result.subtotal).toBe(36000);
    expect(result.hasInvalidItems).toBe(true);
  });

  it("aplica precio mayorista en el subtotal cuando la cantidad cruza el umbral", async () => {
    const product = makeProduct({ stock: 20 });
    getProductsByIds.mockResolvedValue([product]);

    const result = await resolveCart([{ productId: product.id, quantity: 6 }]);

    expect(result.subtotal).toBe(84000); // 6 * 14000 (mayorista), no 6 * 18000
    expect(result.hasInvalidItems).toBe(false);
  });

  it("hasInvalidItems es false cuando todos los items son válidos", async () => {
    const product = makeProduct({ stock: 20 });
    getProductsByIds.mockResolvedValue([product]);

    const result = await resolveCart([{ productId: product.id, quantity: 1 }]);
    expect(result.hasInvalidItems).toBe(false);
  });
});
