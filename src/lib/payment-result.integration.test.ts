/**
 * applyPaymentResult usa SQL crudo (WITH ... UPDATE ... RETURNING ... UPDATE)
 * cuya corrección depende de semántica real de Postgres (una CTE de
 * modificación de datos, visibilidad dentro de la misma transacción) — no
 * tiene sentido mockear esto, hay que probarlo contra Postgres real.
 *
 * Se salta automáticamente si no hay TEST_DATABASE_URL configurada. Para
 * correrlo:
 *
 *   TEST_DATABASE_URL="postgresql://postgres:devpassword@localhost:5433/kode" npm run test
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/db/schema";

const TEST_DB_URL = process.env.TEST_DATABASE_URL;

vi.mock("@/db", async () => {
  const { drizzle: drizzleNodePostgres } = await import("drizzle-orm/node-postgres");
  const { Pool: PgPool } = await import("pg");
  const dbSchema = await import("@/db/schema");
  const pool = new PgPool({ connectionString: process.env.TEST_DATABASE_URL });
  return { db: drizzleNodePostgres(pool, { schema: dbSchema }) };
});

// El envío de email dentro de applyPaymentResult es fire-and-forget — sin
// mockear esto, estos tests dispararían llamadas HTTP reales a Resend. Este
// archivo prueba la semántica de DB (transición de estado + liberación de
// stock), no el envío de emails (ver send-order-email.test.ts).
vi.mock("@/lib/email/send-order-email", () => ({
  sendOrderStatusEmail: vi.fn().mockResolvedValue(undefined),
}));

describe.skipIf(!TEST_DB_URL)("applyPaymentResult (integración, Postgres real)", () => {
  const pool = new Pool({ connectionString: TEST_DB_URL });
  const db = drizzle(pool, { schema });

  let productAId: string;
  let productBId: string;

  async function makeOrder(
    status: "pendiente_pago" | "pagado" | "rechazado" | "en_proceso",
    shippingStatus: "preparando" | "despachado" | "entregado" = "preparando",
  ) {
    const [order] = await db
      .insert(schema.orders)
      .values({
        idempotencyKey: crypto.randomUUID(),
        status,
        shippingStatus,
        customerName: "Test",
        customerEmail: "test@example.com",
        customerPhone: "123",
        shippingAddress: "Calle Falsa 123",
        subtotal: "50000.00",
      })
      .returning();

    await db.insert(schema.orderItems).values([
      {
        orderId: order!.id,
        productId: productAId,
        productName: "Producto A",
        unitPrice: "20000.00",
        quantity: 2,
        lineTotal: "40000.00",
      },
      {
        orderId: order!.id,
        productId: productBId,
        productName: "Producto B",
        unitPrice: "10000.00",
        quantity: 1,
        lineTotal: "10000.00",
      },
    ]);

    return order!.id;
  }

  async function getProductStock(productId: string) {
    const [product] = await db.select().from(schema.products).where(eq(schema.products.id, productId));
    return product?.stock;
  }

  async function getOrderStatus(orderId: string) {
    const [order] = await db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
    return order?.status;
  }

  beforeEach(async () => {
    await db.delete(schema.orderItems);
    await db.delete(schema.orders);
    await db.delete(schema.products);
    await db.delete(schema.categories);

    const [category] = await db
      .insert(schema.categories)
      .values({ name: "Test", slug: `test-${Date.now()}-${Math.random()}` })
      .returning();

    const [productA] = await db
      .insert(schema.products)
      .values({
        name: "Producto A",
        slug: `producto-a-${Date.now()}-${Math.random()}`,
        sku: `A-${Date.now()}-${Math.random()}`,
        retailPrice: "20000.00",
        stock: 10,
        categoryId: category!.id,
      })
      .returning();
    const [productB] = await db
      .insert(schema.products)
      .values({
        name: "Producto B",
        slug: `producto-b-${Date.now()}-${Math.random()}`,
        sku: `B-${Date.now()}-${Math.random()}`,
        retailPrice: "10000.00",
        stock: 5,
        categoryId: category!.id,
      })
      .returning();

    productAId = productA!.id;
    productBId = productB!.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("approved: transiciona a pagado, no toca stock", async () => {
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pendiente_pago");

    const outcome = await applyPaymentResult(orderId, "approved");

    expect(outcome).toEqual({ applied: true, newStatus: "pagado" });
    expect(await getOrderStatus(orderId)).toBe("pagado");
    expect(await getProductStock(productAId)).toBe(10);
    expect(await getProductStock(productBId)).toBe(5);
  });

  it("rejected: transiciona a rechazado y libera el stock de CADA item con su propia cantidad", async () => {
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pendiente_pago");

    const outcome = await applyPaymentResult(orderId, "rejected");

    expect(outcome).toEqual({ applied: true, newStatus: "rechazado" });
    expect(await getOrderStatus(orderId)).toBe("rechazado");
    expect(await getProductStock(productAId)).toBe(12); // 10 + 2
    expect(await getProductStock(productBId)).toBe(6); // 5 + 1
  });

  it("pending/in_process: transiciona a en_proceso, no toca stock", async () => {
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pendiente_pago");

    const outcome = await applyPaymentResult(orderId, "pending");

    expect(outcome).toEqual({ applied: true, newStatus: "en_proceso" });
    expect(await getOrderStatus(orderId)).toBe("en_proceso");
    expect(await getProductStock(productAId)).toBe(10);
  });

  it("orden ya pagada: no-op, no vuelve a tocar stock aunque llegue un 'rejected' tardío", async () => {
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pagado");

    const outcome = await applyPaymentResult(orderId, "rejected");

    expect(outcome).toEqual({ applied: false, newStatus: "rechazado" });
    expect(await getOrderStatus(orderId)).toBe("pagado"); // sin cambios
    expect(await getProductStock(productAId)).toBe(10); // sin cambios
  });

  it("orden ya rechazada: no libera stock una segunda vez", async () => {
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("rechazado");

    const outcome = await applyPaymentResult(orderId, "rejected");

    expect(outcome.applied).toBe(false);
    expect(await getProductStock(productAId)).toBe(10); // sin cambios
  });

  it("en_proceso NO es terminal: una resolución final (rejected) todavía se aplica y libera stock", async () => {
    // Bug real encontrado por la revisión cruzada (outside voice) en el
    // /plan-eng-review de este sprint: el guard original trataba en_proceso
    // como si fuera un estado final.
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("en_proceso");

    const outcome = await applyPaymentResult(orderId, "approved");

    expect(outcome).toEqual({ applied: true, newStatus: "pagado" });
    expect(await getOrderStatus(orderId)).toBe("pagado");
  });

  it("dos llamadas concurrentes con 'rejected' sobre la misma orden liberan el stock UNA sola vez", async () => {
    // Bug real encontrado por la revisión cruzada: el UPDATE de liberación de
    // stock no tenía el mismo guard que el cambio de estado, así que dos
    // ejecuciones casi simultáneas (webhook + cron) podían liberar el mismo
    // stock dos veces. La CTE ata ambos UPDATEs al mismo resultado atómico.
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pendiente_pago");

    const [first, second] = await Promise.all([
      applyPaymentResult(orderId, "rejected"),
      applyPaymentResult(orderId, "rejected"),
    ]);

    const applied = [first, second].filter((r) => r.applied);
    expect(applied).toHaveLength(1);
    expect(await getProductStock(productAId)).toBe(12); // 10 + 2, NO 10 + 4
    expect(await getProductStock(productBId)).toBe(6); // 5 + 1, NO 5 + 2
  });

  it("chargeback sobre un pedido ya despachado: transiciona a rechazado pero NO libera stock fantasma", async () => {
    // Historia 5.3.1: la mercadería ya salió, liberar stock acá inflaría el
    // inventario con unidades que físicamente no están.
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pagado", "despachado");

    const outcome = await applyPaymentResult(orderId, "charged_back");

    expect(outcome).toEqual({ applied: true, newStatus: "rechazado" });
    expect(await getOrderStatus(orderId)).toBe("rechazado");
    expect(await getProductStock(productAId)).toBe(10); // sin cambios, NO 12
    expect(await getProductStock(productBId)).toBe(5); // sin cambios, NO 6
  });

  it("chargeback sobre un pedido ya entregado: mismo comportamiento, no libera stock", async () => {
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pagado", "entregado");

    const outcome = await applyPaymentResult(orderId, "refunded");

    expect(outcome).toEqual({ applied: true, newStatus: "rechazado" });
    expect(await getProductStock(productAId)).toBe(10);
  });

  it("chargeback sobre un pedido pagado que TODAVÍA no se despachó: sí libera stock", async () => {
    // Contraste: el guard nuevo (pagado abierto a un chargeback) no debería
    // desactivar la liberación de stock del caso normal (sin envío todavía).
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pagado", "preparando");

    const outcome = await applyPaymentResult(orderId, "charged_back");

    expect(outcome).toEqual({ applied: true, newStatus: "rechazado" });
    expect(await getProductStock(productAId)).toBe(12);
    expect(await getProductStock(productBId)).toBe(6);
  });

  it("'rejected' tardío (no un chargeback) sobre una orden ya pagada: sigue siendo no-op", async () => {
    // Distinción fina: rejected/cancelled son la resolución ORIGINAL de un
    // intento de pago — una señal tardía/duplicada de esto no debe revertir
    // un pago ya aprobado (a diferencia de un chargeback real, que sí debe).
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pagado", "preparando");

    const outcome = await applyPaymentResult(orderId, "cancelled");

    expect(outcome).toEqual({ applied: false, newStatus: "rechazado" });
    expect(await getOrderStatus(orderId)).toBe("pagado");
    expect(await getProductStock(productAId)).toBe(10);
  });

  it("rejected sobre un pedido que TODAVÍA no se despachó: libera stock normalmente", async () => {
    // Contraste con los dos tests anteriores: confirma que el guard de
    // shippingStatus no rompe el caso normal (rechazo antes del envío).
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pendiente_pago", "preparando");

    const outcome = await applyPaymentResult(orderId, "rejected");

    expect(outcome).toEqual({ applied: true, newStatus: "rechazado" });
    expect(await getProductStock(productAId)).toBe(12);
    expect(await getProductStock(productBId)).toBe(6);
  });

  it("estado de MercadoPago desconocido: no aplica nada", async () => {
    const { applyPaymentResult } = await import("./payment-result");
    const orderId = await makeOrder("pendiente_pago");

    // @ts-expect-error -- probando un valor fuera del union a propósito
    const outcome = await applyPaymentResult(orderId, "some_unknown_status");

    expect(outcome).toEqual({ applied: false, newStatus: null });
    expect(await getOrderStatus(orderId)).toBe("pendiente_pago");
  });
});
