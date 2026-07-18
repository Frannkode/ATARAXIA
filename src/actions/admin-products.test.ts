import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminSession } = vi.hoisted(() => ({
  requireAdminSession: vi.fn().mockResolvedValue({ user: { id: "admin-1" } }),
}));
vi.mock("@/lib/require-admin-session", () => ({ requireAdminSession }));

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { insertReturning, updateReturning, deleteWhere } = vi.hoisted(() => ({
  insertReturning: vi.fn(),
  updateReturning: vi.fn(),
  deleteWhere: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: insertReturning })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: updateReturning })) })),
    })),
    delete: vi.fn(() => ({ where: deleteWhere })),
  },
}));

const { adjustProductStock, createProduct, setProductActive, updateProduct } =
  await import("./admin-products");

const validValues = {
  name: "Remera Básica",
  slug: "remera-basica",
  description: "",
  sku: "REM-100",
  retailPrice: 18000,
  wholesalePrice: null,
  wholesaleMinQty: null,
  stock: 10,
  categoryId: null,
  images: [{ url: "https://res.cloudinary.com/demo/image/upload/x.jpg" }],
};

describe("createProduct", () => {
  beforeEach(() => {
    requireAdminSession.mockClear();
    insertReturning.mockReset();
    redirectMock.mockClear();
  });

  it("requiere sesión de admin antes de tocar la DB", async () => {
    insertReturning.mockResolvedValue([{ id: "prod-1" }]);
    await expect(createProduct(validValues)).rejects.toThrow("NEXT_REDIRECT");
    expect(requireAdminSession).toHaveBeenCalledOnce();
  });

  it("datos inválidos: no llega a tocar la DB", async () => {
    const result = await createProduct({ ...validValues, retailPrice: -1 });
    expect(result?.success).toBe(false);
    expect(insertReturning).not.toHaveBeenCalled();
  });

  it("caso feliz: crea el producto y redirige a /admin/products", async () => {
    insertReturning.mockResolvedValue([{ id: "prod-1" }]);
    await expect(createProduct(validValues)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/admin/products?toast=product-created");
  });

  it("slug/sku duplicado (23505): error amigable, no redirige", async () => {
    const error = new Error("unique violation");
    (error as { cause?: unknown }).cause = { code: "23505" };
    insertReturning.mockRejectedValue(error);

    const result = await createProduct(validValues);
    expect(result?.success).toBe(false);
    expect(result?.error).toMatch(/ya existe/i);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("updateProduct", () => {
  beforeEach(() => {
    updateReturning.mockReset();
    redirectMock.mockClear();
  });

  it("producto no encontrado: error explícito, no redirige", async () => {
    updateReturning.mockResolvedValue([]);
    const result = await updateProduct("does-not-exist", validValues);
    expect(result).toEqual({ success: false, error: "Producto no encontrado." });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("caso feliz: actualiza el producto y redirige a /admin/products", async () => {
    updateReturning.mockResolvedValue([{ id: "prod-1" }]);
    await expect(updateProduct("prod-1", validValues)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/admin/products?toast=product-updated");
  });
});

describe("setProductActive", () => {
  beforeEach(() => {
    updateReturning.mockReset();
  });

  it("soft delete: desactiva sin borrar físicamente", async () => {
    updateReturning.mockResolvedValue([{ id: "prod-1", active: false }]);
    const result = await setProductActive("prod-1", false);
    expect(result).toEqual({ success: true, productId: "prod-1" });
    expect(requireAdminSession).toHaveBeenCalled();
  });

  it("reactivar: vuelve a poner active=true", async () => {
    updateReturning.mockResolvedValue([{ id: "prod-1", active: true }]);
    const result = await setProductActive("prod-1", true);
    expect(result.success).toBe(true);
  });
});

describe("adjustProductStock", () => {
  beforeEach(() => {
    requireAdminSession.mockClear();
    updateReturning.mockReset();
  });

  it("rechaza un delta de 0", async () => {
    const result = await adjustProductStock("prod-1", 0);
    expect(result.success).toBe(false);
    expect(updateReturning).not.toHaveBeenCalled();
  });

  it("rechaza un delta no entero", async () => {
    const result = await adjustProductStock("prod-1", 1.5);
    expect(result.success).toBe(false);
    expect(updateReturning).not.toHaveBeenCalled();
  });

  it("caso feliz: ajusta el stock (delta positivo)", async () => {
    updateReturning.mockResolvedValue([{ id: "prod-1", stock: 20 }]);
    const result = await adjustProductStock("prod-1", 10);
    expect(result).toEqual({ success: true, productId: "prod-1" });
    expect(requireAdminSession).toHaveBeenCalledOnce();
  });

  it("delta negativo que dejaría el stock en negativo (23514): error amigable", async () => {
    const error = new Error("check violation");
    (error as { cause?: unknown }).cause = { code: "23514" };
    updateReturning.mockRejectedValue(error);

    const result = await adjustProductStock("prod-1", -100);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/negativo/i);
  });

  it("producto no encontrado: error explícito", async () => {
    updateReturning.mockResolvedValue([]);
    const result = await adjustProductStock("does-not-exist", 5);
    expect(result).toEqual({ success: false, error: "Producto no encontrado." });
  });
});
