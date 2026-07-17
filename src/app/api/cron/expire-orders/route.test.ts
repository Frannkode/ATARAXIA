import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findMany, paymentSearch, applyPaymentResult } = vi.hoisted(() => ({
  findMany: vi.fn(),
  paymentSearch: vi.fn(),
  applyPaymentResult: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/db", () => ({
  db: { query: { orders: { findMany } } },
}));
vi.mock("@/lib/mercadopago", () => ({
  paymentClient: { search: paymentSearch },
}));
vi.mock("@/lib/payment-result", () => ({ applyPaymentResult }));

const { GET } = await import("./route");

function makeRequest(authHeader?: string) {
  return new NextRequest("http://localhost/api/cron/expire-orders", {
    headers: authHeader ? { authorization: authHeader } : {},
  });
}

describe("GET /api/cron/expire-orders", () => {
  beforeEach(() => {
    findMany.mockReset().mockResolvedValue([]);
    paymentSearch.mockReset();
    applyPaymentResult.mockReset().mockResolvedValue(undefined);
    process.env.CRON_SECRET = "test-cron-secret";
  });

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("sin CRON_SECRET configurado: 401, no consulta ordenes", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(makeRequest("Bearer anything"));
    expect(response.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("sin header de autorización: 401", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
  });

  it("header con secret incorrecto: 401", async () => {
    const response = await GET(makeRequest("Bearer wrong-secret"));
    expect(response.status).toBe(401);
  });

  it("secret correcto, sin ordenes vencidas: 200 con checked=0", async () => {
    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, checked: 0, reconciled: 0 });
  });

  it("orden vencida sin ningún pago encontrado: se trata como abandonada (rejected)", async () => {
    findMany.mockResolvedValue([{ id: "order-1" }]);
    paymentSearch.mockResolvedValue({ results: [] });

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, checked: 1, reconciled: 1 });
    expect(applyPaymentResult).toHaveBeenCalledWith("order-1", "rejected");
  });

  it("orden vencida con un pago encontrado: aplica el estado real de ese pago", async () => {
    findMany.mockResolvedValue([{ id: "order-2" }]);
    paymentSearch.mockResolvedValue({ results: [{ status: "approved" }] });

    await GET(makeRequest("Bearer test-cron-secret"));

    expect(applyPaymentResult).toHaveBeenCalledWith("order-2", "approved");
  });

  it("una orden falla al reconciliar: no bloquea el resto, se refleja en el conteo", async () => {
    findMany.mockResolvedValue([{ id: "order-a" }, { id: "order-b" }]);
    paymentSearch.mockImplementation(async (args: { options: { external_reference: string } }) => {
      if (args.options.external_reference === "order-a") throw new Error("API caída");
      return { results: [] };
    });

    const response = await GET(makeRequest("Bearer test-cron-secret"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, checked: 2, reconciled: 1 });
  });
});
