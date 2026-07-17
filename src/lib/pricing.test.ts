import { describe, expect, it } from "vitest";
import { calculateLineItem, type PricedProduct } from "./pricing";

const withWholesale: PricedProduct = {
  retailPrice: "18000.00",
  wholesalePrice: "14000.00",
  wholesaleMinQty: 6,
};

const withoutWholesale: PricedProduct = {
  retailPrice: "9000.00",
  wholesalePrice: null,
  wholesaleMinQty: null,
};

describe("calculateLineItem", () => {
  it("usa precio minorista cuando la cantidad está debajo del mínimo mayorista", () => {
    const result = calculateLineItem(withWholesale, 5);
    expect(result).toEqual({ unitPrice: 18000, lineTotal: 90000, isWholesale: false });
  });

  it("usa precio mayorista cuando la cantidad es exactamente el mínimo (boundary >=)", () => {
    const result = calculateLineItem(withWholesale, 6);
    expect(result).toEqual({ unitPrice: 14000, lineTotal: 84000, isWholesale: true });
  });

  it("usa precio mayorista cuando la cantidad supera el mínimo", () => {
    const result = calculateLineItem(withWholesale, 10);
    expect(result).toEqual({ unitPrice: 14000, lineTotal: 140000, isWholesale: true });
  });

  it("usa siempre precio minorista si el producto no tiene precio mayorista configurado", () => {
    const result = calculateLineItem(withoutWholesale, 100);
    expect(result).toEqual({ unitPrice: 9000, lineTotal: 900000, isWholesale: false });
  });

  it("rechaza cantidad cero", () => {
    expect(() => calculateLineItem(withWholesale, 0)).toThrow();
  });

  it("rechaza cantidad negativa", () => {
    expect(() => calculateLineItem(withWholesale, -1)).toThrow();
  });

  it("rechaza cantidad no entera", () => {
    expect(() => calculateLineItem(withWholesale, 1.5)).toThrow();
  });

  it("convierte los strings numeric a number, no concatena", () => {
    const result = calculateLineItem(withWholesale, 2);
    expect(result.lineTotal).toBe(36000);
    expect(typeof result.lineTotal).toBe("number");
  });
});
