import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductWithRelations } from "@/db/queries/products";

const { getProductById } = vi.hoisted(() => ({ getProductById: vi.fn() }));

vi.mock("@/db/queries/products", () => ({ getProductById }));

const { previewPrice } = await import("./pricing");

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

describe("previewPrice", () => {
  beforeEach(() => {
    getProductById.mockReset();
  });

  it("devuelve null si el producto no existe (nunca llama a calculateLineItem)", async () => {
    getProductById.mockResolvedValue(undefined);
    const result = await previewPrice("no-existe", 1);
    expect(result).toBeNull();
  });

  it("delega en calculateLineItem para el caso feliz", async () => {
    getProductById.mockResolvedValue(makeProduct());
    const result = await previewPrice("11111111-1111-1111-1111-111111111111", 2);
    expect(result).toEqual({ unitPrice: 18000, lineTotal: 36000, isWholesale: false });
  });

  it("devuelve null (no propaga la excepción) si la cantidad es inválida", async () => {
    getProductById.mockResolvedValue(makeProduct());
    const result = await previewPrice("11111111-1111-1111-1111-111111111111", 0);
    expect(result).toBeNull();
  });

  it("aplica precio mayorista cuando la cantidad cruza el umbral", async () => {
    getProductById.mockResolvedValue(makeProduct());
    const result = await previewPrice("11111111-1111-1111-1111-111111111111", 6);
    expect(result).toEqual({ unitPrice: 14000, lineTotal: 84000, isWholesale: true });
  });
});
