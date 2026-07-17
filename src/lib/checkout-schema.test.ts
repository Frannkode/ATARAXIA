import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./checkout-schema";

const valid = {
  name: "Juana Pérez",
  email: "juana@example.com",
  phone: "+54 9 11 1234-5678",
  address: "Av. Siempre Viva 742, CABA",
  idempotencyKey: "eba6eacf-0422-4149-9041-f7bbd810e9a6",
};

describe("checkoutSchema", () => {
  it("acepta datos válidos", () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
  });

  it("rechaza nombre demasiado corto", () => {
    const result = checkoutSchema.safeParse({ ...valid, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rechaza email inválido", () => {
    const result = checkoutSchema.safeParse({ ...valid, email: "no-es-un-email" });
    expect(result.success).toBe(false);
  });

  it("rechaza teléfono demasiado corto", () => {
    const result = checkoutSchema.safeParse({ ...valid, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("rechaza dirección demasiado corta", () => {
    const result = checkoutSchema.safeParse({ ...valid, address: "Calle 1" });
    expect(result.success).toBe(false);
  });

  it("rechaza idempotencyKey que no es UUID — esto es justo lo que createOrder confía sin re-validar", () => {
    const result = checkoutSchema.safeParse({ ...valid, idempotencyKey: "no-soy-un-uuid" });
    expect(result.success).toBe(false);
  });

  it("recorta espacios en blanco (trim) en los campos de texto", () => {
    const result = checkoutSchema.safeParse({ ...valid, name: "  Juana Pérez  " });
    expect(result.success && result.data.name).toBe("Juana Pérez");
  });
});
