import { describe, expect, it } from "vitest";
import { productSchema } from "./product-schema";

const valid = {
  name: "Remera Básica",
  slug: "remera-basica",
  description: "Una remera",
  sku: "REM-100",
  retailPrice: 18000,
  wholesalePrice: null,
  wholesaleMinQty: null,
  stock: 10,
  categoryId: null,
  images: [],
};

describe("productSchema", () => {
  it("acepta datos válidos sin precio mayorista", () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta datos válidos con precio mayorista Y cantidad mínima", () => {
    const result = productSchema.safeParse({
      ...valid,
      wholesalePrice: 14000,
      wholesaleMinQty: 6,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza precio mayorista SIN cantidad mínima (van juntos)", () => {
    const result = productSchema.safeParse({ ...valid, wholesalePrice: 14000 });
    expect(result.success).toBe(false);
  });

  it("rechaza cantidad mínima SIN precio mayorista (van juntos)", () => {
    const result = productSchema.safeParse({ ...valid, wholesaleMinQty: 6 });
    expect(result.success).toBe(false);
  });

  it("rechaza slug con mayúsculas o espacios", () => {
    const result = productSchema.safeParse({ ...valid, slug: "Remera Basica" });
    expect(result.success).toBe(false);
  });

  it("rechaza precio minorista negativo o cero", () => {
    expect(productSchema.safeParse({ ...valid, retailPrice: 0 }).success).toBe(false);
    expect(productSchema.safeParse({ ...valid, retailPrice: -100 }).success).toBe(false);
  });

  it("rechaza stock negativo", () => {
    expect(productSchema.safeParse({ ...valid, stock: -1 }).success).toBe(false);
  });
});
