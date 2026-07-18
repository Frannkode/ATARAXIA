/**
 * overrideOrderStatus usa el mismo mecanismo de CTE atómico que
 * payment-result.ts (ver ahí), pero con su propio guard de concurrencia
 * optimista + reserva/liberación de stock + audit log en el mismo statement
 * — se prueba contra Postgres real por la misma razón que payment-result.
 *
 * Se salta automáticamente si no hay TEST_DATABASE_URL configurada. Para
 * correrlo:
 *
 *   TEST_DATABASE_URL="postgresql://postgres:devpassword@localhost:5433/ataraxia" npm run test
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

describe.skipIf(!TEST_DB_URL)("overrideOrderStatus (integración, Postgres real)", () => {
  const pool = new Pool({ connectionString: TEST_DB_URL });
  const db = drizzle(pool, { schema });

  let productAId: string;
  let adminUserId: string;

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
        subtotal: "40000.00",
      })
      .returning();

    await db.insert(schema.orderItems).values({
      orderId: order!.id,
      productId: productAId,
      productName: "Producto A",
      unitPrice: "20000.00",
      quantity: 2,
      lineTotal: "40000.00",
    });

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

  async function getAuditLogs(orderId: string) {
    return db
      .select()
      .from(schema.orderStatusAuditLog)
      .where(eq(schema.orderStatusAuditLog.orderId, orderId));
  }

  beforeEach(async () => {
    await db.delete(schema.orderStatusAuditLog);
    await db.delete(schema.orderItems);
    await db.delete(schema.orders);
    await db.delete(schema.products);
    await db.delete(schema.categories);
    await db.delete(schema.user);

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
    productAId = productA!.id;

    const [adminUser] = await db
      .insert(schema.user)
      .values({ id: crypto.randomUUID(), name: "Admin", email: `admin-${Date.now()}@example.com` })
      .returning();
    adminUserId = adminUser!.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("corrige un pedido ya rechazado a pagado: re-reserva stock y queda auditado", async () => {
    const { overrideOrderStatus } = await import("./order-status-override");
    const orderId = await makeOrder("rechazado");
    // El rechazo ya habría liberado el stock antes — simulamos ese estado previo.
    await db.update(schema.products).set({ stock: 12 }).where(eq(schema.products.id, productAId));

    const result = await overrideOrderStatus(orderId, "pagado", adminUserId, "pago confirmado manual");

    expect(result).toEqual({ success: true });
    expect(await getOrderStatus(orderId)).toBe("pagado");
    expect(await getProductStock(productAId)).toBe(10); // 12 - 2, re-reservado

    const logs = await getAuditLogs(orderId);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      fromStatus: "rechazado",
      toStatus: "pagado",
      changedByUserId: adminUserId,
      reason: "pago confirmado manual",
    });
  });

  it("corrige un pedido ya pagado a rechazado: libera stock y audita", async () => {
    const { overrideOrderStatus } = await import("./order-status-override");
    const orderId = await makeOrder("pagado", "preparando");

    const result = await overrideOrderStatus(orderId, "rechazado", adminUserId, undefined);

    expect(result).toEqual({ success: true });
    expect(await getProductStock(productAId)).toBe(12); // 10 + 2
    const logs = await getAuditLogs(orderId);
    expect(logs[0]).toMatchObject({ fromStatus: "pagado", toStatus: "rechazado" });
  });

  it("override a rechazado sobre un pedido YA despachado: no libera stock fantasma (mismo criterio que 5.3.1)", async () => {
    const { overrideOrderStatus } = await import("./order-status-override");
    const orderId = await makeOrder("pagado", "despachado");

    const result = await overrideOrderStatus(orderId, "rechazado", adminUserId, undefined);

    expect(result).toEqual({ success: true });
    expect(await getProductStock(productAId)).toBe(10); // sin cambios
  });

  it("override a pagado sin stock suficiente: rechaza sin aplicar nada (ni el cambio de estado ni la auditoría)", async () => {
    const { overrideOrderStatus } = await import("./order-status-override");
    const orderId = await makeOrder("rechazado");
    // Stock insuficiente para re-reservar 2 unidades: dejamos solo 1.
    await db.update(schema.products).set({ stock: 1 }).where(eq(schema.products.id, productAId));

    const result = await overrideOrderStatus(orderId, "pagado", adminUserId, undefined);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/stock suficiente/i);
    expect(await getOrderStatus(orderId)).toBe("rechazado"); // sin cambios
    expect(await getProductStock(productAId)).toBe(1); // sin cambios
    expect(await getAuditLogs(orderId)).toHaveLength(0); // no queda auditoría de algo que no pasó
  });

  it("mismo estado actual y destino: rechaza sin tocar nada", async () => {
    const { overrideOrderStatus } = await import("./order-status-override");
    const orderId = await makeOrder("pagado");

    const result = await overrideOrderStatus(orderId, "pagado", adminUserId, undefined);

    expect(result.success).toBe(false);
    expect(await getAuditLogs(orderId)).toHaveLength(0);
  });

  it("concurrencia optimista: dos overrides casi simultáneos sobre la misma orden, solo uno aplica", async () => {
    const { overrideOrderStatus } = await import("./order-status-override");
    const orderId = await makeOrder("pendiente_pago");

    const [first, second] = await Promise.all([
      overrideOrderStatus(orderId, "pagado", adminUserId, "intento 1"),
      overrideOrderStatus(orderId, "en_proceso", adminUserId, "intento 2"),
    ]);

    const successes = [first, second].filter((r) => r.success);
    expect(successes).toHaveLength(1);
    expect(await getAuditLogs(orderId)).toHaveLength(1); // solo el que ganó queda auditado
  });

  it("pedido inexistente: error explícito", async () => {
    const { overrideOrderStatus } = await import("./order-status-override");
    const result = await overrideOrderStatus(
      "00000000-0000-0000-0000-000000000000",
      "pagado",
      adminUserId,
      undefined,
    );
    expect(result).toEqual({ success: false, error: "Pedido no encontrado." });
  });
});
