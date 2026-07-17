import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { validateMock, paymentGet } = vi.hoisted(() => ({
  validateMock: vi.fn(),
  paymentGet: vi.fn(),
}));

class MockInvalidWebhookSignatureError extends Error {
  reason: string;
  constructor(reason: string) {
    super("invalid signature");
    this.reason = reason;
  }
}

vi.mock("mercadopago", () => ({
  WebhookSignatureValidator: { validate: validateMock },
  InvalidWebhookSignatureError: MockInvalidWebhookSignatureError,
}));

vi.mock("@/lib/mercadopago", () => ({
  paymentClient: { get: paymentGet },
}));

const { getOrderById } = vi.hoisted(() => ({ getOrderById: vi.fn() }));
vi.mock("@/db/queries/orders", () => ({ getOrderById }));

const { dbInsertValues } = vi.hoisted(() => ({ dbInsertValues: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/db", () => ({
  db: { insert: vi.fn(() => ({ values: dbInsertValues })) },
}));

const { applyPaymentResult } = vi.hoisted(() => ({ applyPaymentResult: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/payment-result", () => ({ applyPaymentResult }));

const { POST } = await import("./route");

function makeRequest(searchParams: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/webhooks/mercadopago?${searchParams}`, {
    method: "POST",
    headers,
  });
}

describe("POST /api/webhooks/mercadopago", () => {
  beforeEach(() => {
    validateMock.mockReset();
    paymentGet.mockReset();
    getOrderById.mockReset();
    dbInsertValues.mockReset().mockResolvedValue(undefined);
    applyPaymentResult.mockReset().mockResolvedValue(undefined);
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "test-secret";
  });

  afterEach(() => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
  });

  it("topic distinto de 'payment' (ej. merchant_order): 200 sin validar firma ni tocar la DB", async () => {
    const request = makeRequest("type=merchant_order&data.id=123");
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(validateMock).not.toHaveBeenCalled();
    expect(paymentGet).not.toHaveBeenCalled();
  });

  it("sin MERCADOPAGO_WEBHOOK_SECRET configurado: 500", async () => {
    delete process.env.MERCADOPAGO_WEBHOOK_SECRET;
    const request = makeRequest("type=payment&data.id=123");
    const response = await POST(request);

    expect(response.status).toBe(500);
    expect(validateMock).not.toHaveBeenCalled();
  });

  it("firma inválida: rechaza con 401, no toca la DB ni consulta el pago", async () => {
    validateMock.mockImplementation(() => {
      throw new MockInvalidWebhookSignatureError("SignatureMismatch");
    });

    const request = makeRequest("type=payment&data.id=123", { "x-signature": "ts=1,v1=bad" });
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(paymentGet).not.toHaveBeenCalled();
    expect(dbInsertValues).not.toHaveBeenCalled();
  });

  it("firma válida pero falla la consulta a la API de MercadoPago: 200 igual (no reintentar indefinidamente)", async () => {
    validateMock.mockImplementation(() => undefined);
    paymentGet.mockRejectedValue(new Error("network error"));

    const request = makeRequest("type=payment&data.id=123");
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(dbInsertValues).not.toHaveBeenCalled();
  });

  it("payment sin external_reference: 200, no procesa", async () => {
    validateMock.mockImplementation(() => undefined);
    paymentGet.mockResolvedValue({ status: "approved" }); // sin external_reference

    const request = makeRequest("type=payment&data.id=123");
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(getOrderById).not.toHaveBeenCalled();
  });

  it("external_reference no corresponde a ningún pedido: 200, no registra idempotencia", async () => {
    validateMock.mockImplementation(() => undefined);
    paymentGet.mockResolvedValue({ status: "approved", external_reference: "orphan-order" });
    getOrderById.mockResolvedValue(undefined);

    const request = makeRequest("type=payment&data.id=123");
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(dbInsertValues).not.toHaveBeenCalled();
  });

  it("caso feliz: registra idempotencia y aplica el resultado del pago", async () => {
    validateMock.mockImplementation(() => undefined);
    paymentGet.mockResolvedValue({ status: "approved", external_reference: "order-1" });
    getOrderById.mockResolvedValue({ id: "order-1" });

    const request = makeRequest("type=payment&data.id=pay-123");
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(dbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay-123", orderId: "order-1", status: "approved" }),
    );
    expect(applyPaymentResult).toHaveBeenCalledWith("order-1", "approved");
  });

  it("paymentId duplicado (webhook reenviado): 200 deduped, NO vuelve a aplicar el resultado", async () => {
    validateMock.mockImplementation(() => undefined);
    paymentGet.mockResolvedValue({ status: "approved", external_reference: "order-1" });
    getOrderById.mockResolvedValue({ id: "order-1" });

    const duplicateError = new Error("unique violation");
    (duplicateError as { cause?: unknown }).cause = { code: "23505" };
    dbInsertValues.mockRejectedValue(duplicateError);

    const request = makeRequest("type=payment&data.id=pay-123");
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.deduped).toBe(true);
    expect(applyPaymentResult).not.toHaveBeenCalled();
  });
});
