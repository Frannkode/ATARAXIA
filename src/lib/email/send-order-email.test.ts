import { beforeEach, describe, expect, it, vi } from "vitest";

const { getOrderById } = vi.hoisted(() => ({ getOrderById: vi.fn() }));
vi.mock("@/db/queries/orders", () => ({ getOrderById }));

const { emailsSend } = vi.hoisted(() => ({ emailsSend: vi.fn().mockResolvedValue({ data: { id: "email-1" } }) }));
vi.mock("@/lib/email/resend-client", () => ({ resend: { emails: { send: emailsSend } } }));

const { sendOrderStatusEmail } = await import("./send-order-email");

function makeOrder() {
  return {
    id: "order-1",
    customerName: "Juana Pérez",
    customerEmail: "juana@example.com",
    subtotal: "40000.00",
    items: [{ productName: "Remera", quantity: 2, lineTotal: "40000.00" }],
  };
}

describe("sendOrderStatusEmail", () => {
  beforeEach(() => {
    getOrderById.mockReset();
    emailsSend.mockReset().mockResolvedValue({ data: { id: "email-1" } });
  });

  it("orden inexistente: no llama a Resend", async () => {
    getOrderById.mockResolvedValue(undefined);
    await sendOrderStatusEmail("does-not-exist", "pagado");
    expect(emailsSend).not.toHaveBeenCalled();
  });

  it("pagado: manda el email de aprobado al email del cliente", async () => {
    getOrderById.mockResolvedValue(makeOrder());
    await sendOrderStatusEmail("order-1", "pagado");

    expect(emailsSend).toHaveBeenCalledOnce();
    const callArgs = emailsSend.mock.calls[0]![0];
    expect(callArgs.to).toBe("juana@example.com");
    expect(callArgs.subject).toMatch(/aprobado/i);
  });

  it("rechazado: manda el email de rechazo", async () => {
    getOrderById.mockResolvedValue(makeOrder());
    await sendOrderStatusEmail("order-1", "rechazado");

    expect(emailsSend).toHaveBeenCalledOnce();
    const callArgs = emailsSend.mock.calls[0]![0];
    expect(callArgs.subject).toMatch(/no pudimos procesar/i);
  });
});
