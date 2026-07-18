import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminSession } = vi.hoisted(() => ({
  requireAdminSession: vi.fn().mockResolvedValue({ user: { id: "admin-1" } }),
}));
vi.mock("@/lib/require-admin-session", () => ({ requireAdminSession }));

const { overrideOrderStatus } = vi.hoisted(() => ({
  overrideOrderStatus: vi.fn(),
}));
vi.mock("@/lib/order-status-override", () => ({ overrideOrderStatus }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { selectWhere, updateWhere } = vi.hoisted(() => ({
  selectWhere: vi.fn(),
  updateWhere: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(() => ({ from: vi.fn(() => ({ where: selectWhere })) })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
  },
}));

const { overrideOrderStatusAction, updateShippingStatus } = await import("./admin-orders");

describe("overrideOrderStatusAction", () => {
  beforeEach(() => {
    requireAdminSession.mockClear();
    overrideOrderStatus.mockReset();
  });

  it("requiere sesión de admin y pasa el userId de la sesión", async () => {
    overrideOrderStatus.mockResolvedValue({ success: true });
    await overrideOrderStatusAction("order-1", "pagado", "motivo");

    expect(requireAdminSession).toHaveBeenCalledOnce();
    expect(overrideOrderStatus).toHaveBeenCalledWith("order-1", "pagado", "admin-1", "motivo");
  });

  it("propaga el resultado de error sin modificarlo", async () => {
    overrideOrderStatus.mockResolvedValue({ success: false, error: "algo pasó" });
    const result = await overrideOrderStatusAction("order-1", "pagado", undefined);
    expect(result).toEqual({ success: false, error: "algo pasó" });
  });
});

describe("updateShippingStatus", () => {
  beforeEach(() => {
    requireAdminSession.mockClear();
    selectWhere.mockReset();
    updateWhere.mockClear();
  });

  it("pedido no encontrado: error explícito", async () => {
    selectWhere.mockResolvedValue([]);
    const result = await updateShippingStatus("order-1", "despachado");
    expect(result).toEqual({ success: false, error: "Pedido no encontrado." });
  });

  it("bloquea marcar 'entregado' si el pedido no está pagado", async () => {
    selectWhere.mockResolvedValue([{ id: "order-1", status: "pendiente_pago" }]);
    const result = await updateShippingStatus("order-1", "entregado");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no está pagado/i);
    expect(updateWhere).not.toHaveBeenCalled();
  });

  it("permite 'entregado' si el pedido SÍ está pagado", async () => {
    selectWhere.mockResolvedValue([{ id: "order-1", status: "pagado" }]);
    const result = await updateShippingStatus("order-1", "entregado");
    expect(result).toEqual({ success: true });
  });

  it("permite 'despachado'/'preparando' sin importar el estado de pago", async () => {
    selectWhere.mockResolvedValue([{ id: "order-1", status: "pendiente_pago" }]);
    const result = await updateShippingStatus("order-1", "despachado");
    expect(result).toEqual({ success: true });
  });
});
