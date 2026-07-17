import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderById } = vi.hoisted(() => ({ getOrderById: vi.fn() }));
const { preferenceCreate, preferenceGet } = vi.hoisted(() => ({
  preferenceCreate: vi.fn(),
  preferenceGet: vi.fn(),
}));
const { updateWhere, updateSet } = vi.hoisted(() => ({
  updateWhere: vi.fn().mockResolvedValue(undefined),
  updateSet: vi.fn(),
}));
updateSet.mockImplementation(() => ({ where: updateWhere }));

vi.mock("@/db/queries/orders", () => ({ getOrderById }));
vi.mock("@/lib/mercadopago", () => ({
  preferenceClient: { create: preferenceCreate, get: preferenceGet },
  EXCLUDED_PAYMENT_TYPES: [{ id: "ticket" }, { id: "atm" }, { id: "bank_transfer" }],
}));
vi.mock("@/db", () => ({
  db: { update: vi.fn(() => ({ set: updateSet })) },
}));

const { createPaymentPreference } = await import("./mercadopago");

function makeOrder(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "order-1",
    status: "pendiente_pago",
    mercadopagoPreferenceId: null,
    items: [
      { productId: "prod-1", productName: "Remera", quantity: 2, unitPrice: "18000.00" },
    ],
    ...overrides,
  };
}

describe("createPaymentPreference", () => {
  beforeEach(() => {
    getOrderById.mockReset();
    preferenceCreate.mockReset();
    preferenceGet.mockReset();
    updateWhere.mockClear();
  });

  it("pedido no encontrado: devuelve error sin llamar a MercadoPago", async () => {
    getOrderById.mockResolvedValue(undefined);
    const result = await createPaymentPreference("does-not-exist");
    expect(result).toEqual({ success: false, error: "Pedido no encontrado." });
    expect(preferenceCreate).not.toHaveBeenCalled();
  });

  it("pedido ya pagado: rechaza generar un nuevo intento de pago", async () => {
    getOrderById.mockResolvedValue(makeOrder({ status: "pagado" }));
    const result = await createPaymentPreference("order-1");
    expect(result.success).toBe(false);
    expect(preferenceCreate).not.toHaveBeenCalled();
  });

  it("pedido en_proceso: rechaza generar otro intento de pago en paralelo", async () => {
    getOrderById.mockResolvedValue(makeOrder({ status: "en_proceso" }));
    const result = await createPaymentPreference("order-1");
    expect(result.success).toBe(false);
    expect(preferenceCreate).not.toHaveBeenCalled();
  });

  it("primer intento (sin preferenceId previo): crea la preferencia y la persiste en la orden", async () => {
    getOrderById.mockResolvedValue(makeOrder());
    preferenceCreate.mockResolvedValue({ id: "pref-123", init_point: "https://mp.example/pref-123" });

    const result = await createPaymentPreference("order-1");

    expect(result).toEqual({ success: true, initPoint: "https://mp.example/pref-123" });
    expect(preferenceCreate).toHaveBeenCalledOnce();
    expect(updateWhere).toHaveBeenCalledOnce();
  });

  it("excluye métodos de pago offline (ticket/atm/bank_transfer) de la preferencia", async () => {
    getOrderById.mockResolvedValue(makeOrder());
    preferenceCreate.mockResolvedValue({ id: "pref-123", init_point: "https://mp.example/pref-123" });

    await createPaymentPreference("order-1");

    const callArgs = preferenceCreate.mock.calls[0]![0];
    expect(callArgs.body.payment_methods.excluded_payment_types).toEqual([
      { id: "ticket" },
      { id: "atm" },
      { id: "bank_transfer" },
    ]);
  });

  it("reintento con preferenceId existente y todavía válida: reutiliza el init_point sin crear una nueva", async () => {
    getOrderById.mockResolvedValue(makeOrder({ mercadopagoPreferenceId: "pref-existing" }));
    preferenceGet.mockResolvedValue({ id: "pref-existing", init_point: "https://mp.example/pref-existing" });

    const result = await createPaymentPreference("order-1");

    expect(result).toEqual({ success: true, initPoint: "https://mp.example/pref-existing" });
    expect(preferenceGet).toHaveBeenCalledWith({ preferenceId: "pref-existing" });
    expect(preferenceCreate).not.toHaveBeenCalled();
  });

  it("reintento con preferenceId vencida/no encontrada: genera una preferencia nueva", async () => {
    getOrderById.mockResolvedValue(makeOrder({ mercadopagoPreferenceId: "pref-expired" }));
    preferenceGet.mockRejectedValue(new Error("404"));
    preferenceCreate.mockResolvedValue({ id: "pref-new", init_point: "https://mp.example/pref-new" });

    const result = await createPaymentPreference("order-1");

    expect(result).toEqual({ success: true, initPoint: "https://mp.example/pref-new" });
    expect(preferenceCreate).toHaveBeenCalledOnce();
  });

  it("MercadoPago falla al crear la preferencia: devuelve error amigable", async () => {
    getOrderById.mockResolvedValue(makeOrder());
    preferenceCreate.mockRejectedValue(new Error("network error"));

    const result = await createPaymentPreference("order-1");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no pudimos generar/i);
  });
});
