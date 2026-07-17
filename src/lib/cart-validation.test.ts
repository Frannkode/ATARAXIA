import { describe, expect, it } from "vitest";
import { validateCartItems } from "./cart-validation";
import type { ProductWithRelations } from "@/db/queries/products";

function makeProduct(overrides: Partial<ProductWithRelations> = {}): ProductWithRelations {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Remera",
    slug: "remera",
    description: null,
    sku: "REM-001",
    retailPrice: "18000.00",
    wholesalePrice: null,
    wholesaleMinQty: null,
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

describe("validateCartItems", () => {
  it("marca inválido un producto que no está en la lista (no existe/borrado)", () => {
    const [result] = validateCartItems([{ productId: "does-not-exist", quantity: 1 }], []);
    expect(result).toMatchObject({ valid: false, reason: "not_found", product: null });
  });

  it("marca inválido un producto inactivo, pero conserva sus datos para mostrar el nombre", () => {
    const product = makeProduct({ active: false });
    const [result] = validateCartItems([{ productId: product.id, quantity: 1 }], [product]);
    expect(result).toMatchObject({ valid: false, reason: "inactive" });
    expect(result?.product?.name).toBe("Remera");
  });

  it("marca inválido si la cantidad pedida supera el stock disponible", () => {
    const product = makeProduct({ stock: 2 });
    const [result] = validateCartItems([{ productId: product.id, quantity: 5 }], [product]);
    expect(result).toMatchObject({ valid: false, reason: "insufficient_stock", maxAvailable: 2 });
  });

  it("es válido cuando la cantidad pedida es EXACTAMENTE igual al stock disponible (boundary)", () => {
    const product = makeProduct({ stock: 3 });
    const [result] = validateCartItems([{ productId: product.id, quantity: 3 }], [product]);
    expect(result).toMatchObject({ valid: true });
  });

  it("es válido cuando el producto existe, está activo y hay stock suficiente", () => {
    const product = makeProduct({ stock: 5 });
    const [result] = validateCartItems([{ productId: product.id, quantity: 3 }], [product]);
    expect(result).toMatchObject({ valid: true });
  });

  it("marca inválido cantidad cero", () => {
    const product = makeProduct();
    const [result] = validateCartItems([{ productId: product.id, quantity: 0 }], [product]);
    expect(result).toMatchObject({ valid: false, reason: "invalid_quantity" });
  });

  it("marca inválido cantidad negativa", () => {
    const product = makeProduct();
    const [result] = validateCartItems([{ productId: product.id, quantity: -2 }], [product]);
    expect(result).toMatchObject({ valid: false, reason: "invalid_quantity" });
  });

  it("marca inválido cantidad no entera", () => {
    const product = makeProduct();
    const [result] = validateCartItems([{ productId: product.id, quantity: 1.5 }], [product]);
    expect(result).toMatchObject({ valid: false, reason: "invalid_quantity" });
  });

  it("una cantidad inválida se detecta ANTES que 'no existe' — request armado a mano con productId falso y quantity 0", () => {
    const [result] = validateCartItems([{ productId: "does-not-exist", quantity: 0 }], []);
    expect(result).toMatchObject({ valid: false, reason: "invalid_quantity" });
  });

  it("fusiona productId repetidos sumando cantidades (request armado a mano, no lo genera la UI)", () => {
    const product = makeProduct({ stock: 20, wholesaleMinQty: 6, wholesalePrice: "14000.00" });
    const result = validateCartItems(
      [
        { productId: product.id, quantity: 4 },
        { productId: product.id, quantity: 2 },
      ],
      [product],
    );

    // Una sola línea con cantidad 6 (no dos líneas de 4 y 2) — así el umbral
    // mayorista se evalúa sobre el total, no por línea fragmentada.
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ quantity: 6, valid: true });
  });
});
