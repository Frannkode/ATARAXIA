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

const { insertReturning, updateReturning, deleteReturning, selectLimit } = vi.hoisted(() => ({
  insertReturning: vi.fn(),
  updateReturning: vi.fn(),
  deleteReturning: vi.fn(),
  selectLimit: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(() => ({ values: vi.fn(() => ({ returning: insertReturning })) })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: updateReturning })) })),
    })),
    delete: vi.fn(() => ({ where: vi.fn(() => ({ returning: deleteReturning })) })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({ where: vi.fn(() => ({ limit: selectLimit })) })),
    })),
  },
}));

const { createCategory, deleteCategory, updateCategory } = await import("./admin-categories");

describe("createCategory / updateCategory", () => {
  beforeEach(() => {
    requireAdminSession.mockClear();
    insertReturning.mockReset();
    updateReturning.mockReset();
    redirectMock.mockClear();
  });

  it("crea la categoría y redirige a /admin/categories", async () => {
    insertReturning.mockResolvedValue([{ id: "cat-1" }]);
    await expect(createCategory({ name: "Remeras", slug: "remeras" })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(requireAdminSession).toHaveBeenCalledOnce();
    expect(redirectMock).toHaveBeenCalledWith("/admin/categories?toast=category-created");
  });

  it("slug duplicado (23505): error amigable, no redirige", async () => {
    const error = new Error("unique violation");
    (error as { cause?: unknown }).cause = { code: "23505" };
    insertReturning.mockRejectedValue(error);

    const result = await createCategory({ name: "Remeras", slug: "remeras" });
    expect(result?.success).toBe(false);
    expect(result?.error).toMatch(/ya existe/i);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("actualiza la categoría y redirige a /admin/categories", async () => {
    updateReturning.mockResolvedValue([{ id: "cat-1" }]);
    await expect(
      updateCategory("cat-1", { name: "Remeras Nuevas", slug: "remeras" }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/admin/categories?toast=category-updated");
  });
});

describe("deleteCategory", () => {
  beforeEach(() => {
    selectLimit.mockReset();
    deleteReturning.mockReset();
  });

  it("bloquea el borrado si hay productos ACTIVOS asociados", async () => {
    selectLimit.mockResolvedValue([{ id: "prod-1" }]);
    const result = await deleteCategory("cat-1");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/productos activos/i);
    expect(deleteReturning).not.toHaveBeenCalled();
  });

  it("permite borrar si solo hay productos inactivos (soft-deleted)", async () => {
    // La query de chequeo ya filtra por active=true (ver deleteCategory) —
    // acá simula el caso donde esa query no encuentra ninguno.
    selectLimit.mockResolvedValue([]);
    deleteReturning.mockResolvedValue([{ id: "cat-1" }]);

    const result = await deleteCategory("cat-1");
    expect(result).toEqual({ success: true, categoryId: "cat-1" });
  });

  it("categoría inexistente: error explícito", async () => {
    selectLimit.mockResolvedValue([]);
    deleteReturning.mockResolvedValue([]);

    const result = await deleteCategory("does-not-exist");
    expect(result).toEqual({ success: false, error: "Categoría no encontrada." });
  });
});
