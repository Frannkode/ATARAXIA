/**
 * Test de integración de createOrder EN SÍ (no solo el mecanismo SQL crudo
 * que prueba orders.integration.test.ts) — mockea @/db para que el Server
 * Action real (con su lógica de idempotencia, validación y manejo de
 * errores) corra contra Postgres local en vez del driver neon-http de
 * producción.
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

vi.mock("@/lib/client-ip", () => ({ getClientIp: vi.fn().mockResolvedValue("127.0.0.1") }));

vi.mock("@/db", async () => {
  const { drizzle: drizzleNodePostgres } = await import("drizzle-orm/node-postgres");
  const { Pool: PgPool } = await import("pg");
  const dbSchema = await import("@/db/schema");
  const pool = new PgPool({ connectionString: process.env.TEST_DATABASE_URL });
  const dbInstance = drizzleNodePostgres(pool, { schema: dbSchema });

  // drizzle-orm/node-postgres no tiene db.batch() (es específico de
  // neon-http, ver createOrder en orders.ts). Acá se ejecuta secuencialmente
  // solo para validar la LÓGICA de createOrder (idempotencia, cálculo de
  // precios, mensajes de error) contra Postgres real; la atomicidad real del
  // batch ya está probada por orders.integration.test.ts contra el CHECK
  // constraint con SQL crudo.
  (dbInstance as unknown as { batch: (queries: Promise<unknown>[]) => Promise<unknown[]> }).batch =
    async (queries) => {
      const results = [];
      for (const query of queries) results.push(await query);
      return results;
    };

  return { db: dbInstance };
});

describe.skipIf(!TEST_DB_URL)("createOrder (integración, Server Action real)", () => {
  const pool = new Pool({ connectionString: TEST_DB_URL });
  const db = drizzle(pool, { schema });

  let categoryId: string;
  let productId: string;

  const validForm = () => ({
    name: "Juana Pérez",
    email: "juana@example.com",
    phone: "+54 9 11 1234-5678",
    address: "Av. Siempre Viva 742, CABA",
    idempotencyKey: crypto.randomUUID(),
  });

  beforeEach(async () => {
    await db.delete(schema.orderItems);
    await db.delete(schema.orders);
    await db.delete(schema.products);
    await db.delete(schema.categories);
    // El rate limit por IP (127.0.0.1, mockeado arriba) no debe acumularse
    // entre tests — cada uno arranca con el contador en cero.
    await db.delete(schema.orderRateLimitAttempts);

    const [category] = await db
      .insert(schema.categories)
      .values({ name: "Test", slug: `test-${Date.now()}-${Math.random()}` })
      .returning();
    categoryId = category!.id;

    const [product] = await db
      .insert(schema.products)
      .values({
        name: "Remera de prueba",
        slug: `remera-test-${Date.now()}-${Math.random()}`,
        sku: `TEST-${Date.now()}-${Math.random()}`,
        retailPrice: "18000.00",
        wholesalePrice: "14000.00",
        wholesaleMinQty: 6,
        stock: 10,
        categoryId,
      })
      .returning();
    productId = product!.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("caso feliz: crea la orden, descuenta stock, y aplica precio mayorista si corresponde", async () => {
    const { createOrder } = await import("./orders");

    const result = await createOrder(validForm(), [{ productId, quantity: 6 }]);

    expect(result.success).toBe(true);
    expect(result.orderId).toBeDefined();

    const [order] = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, result.orderId!));
    expect(order?.subtotal).toBe("84000.00"); // 6 * 14000 (mayorista, no minorista)

    const items = await db
      .select()
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, result.orderId!));
    expect(items).toHaveLength(1);
    expect(items[0]?.unitPrice).toBe("14000.00");

    const [updatedProduct] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(updatedProduct?.stock).toBe(4); // 10 - 6
  });

  it("idempotencia: el mismo idempotencyKey dos veces devuelve la MISMA orden y descuenta stock una sola vez", async () => {
    const { createOrder } = await import("./orders");
    const form = validForm();

    const first = await createOrder(form, [{ productId, quantity: 2 }]);
    const second = await createOrder(form, [{ productId, quantity: 2 }]);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.orderId).toBe(first.orderId);

    const allOrders = await db.select().from(schema.orders);
    expect(allOrders).toHaveLength(1);

    const [updatedProduct] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(updatedProduct?.stock).toBe(8); // 10 - 2, NO 10 - 4
  });

  it("stock insuficiente: rechaza con mensaje amigable, no crea orden ni toca stock", async () => {
    const { createOrder } = await import("./orders");

    const result = await createOrder(validForm(), [{ productId, quantity: 999 }]);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no está disponible/i);

    const allOrders = await db.select().from(schema.orders);
    expect(allOrders).toHaveLength(0);

    const [updatedProduct] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.id, productId));
    expect(updatedProduct?.stock).toBe(10); // sin cambios
  });

  it("carrito vacío: rechaza sin tocar la base", async () => {
    const { createOrder } = await import("./orders");
    const result = await createOrder(validForm(), []);
    expect(result).toEqual({ success: false, error: "El carrito está vacío." });
  });

  it("rate limit: bloquea despues de 5 intentos nuevos desde la misma IP en la ventana", async () => {
    const { createOrder } = await import("./orders");

    for (let i = 0; i < 5; i++) {
      const result = await createOrder(validForm(), [{ productId, quantity: 1 }]);
      expect(result.success).toBe(true);
    }

    const blocked = await createOrder(validForm(), [{ productId, quantity: 1 }]);
    expect(blocked).toEqual({
      success: false,
      error: "Demasiados intentos. Esperá unos minutos antes de volver a intentar.",
    });

    // El bloqueo corta ANTES de tocar stock/orders: nada nuevo se creo en el 6to intento.
    const allOrders = await db.select().from(schema.orders);
    expect(allOrders).toHaveLength(5);
  });

  it("rate limit: un retry con la MISMA idempotencyKey no consume cupo (no penaliza un retry legitimo)", async () => {
    const { createOrder } = await import("./orders");
    const form = validForm();

    // 1er intento real (consume 1 de 5).
    const first = await createOrder(form, [{ productId, quantity: 1 }]);
    expect(first.success).toBe(true);

    // Agota el resto del cupo con intentos nuevos distintos (4 mas = 5 total).
    for (let i = 0; i < 4; i++) {
      await createOrder(validForm(), [{ productId, quantity: 1 }]);
    }

    // Reenviar la MISMA key de un pedido ya creado debe seguir funcionando
    // aunque el cupo este agotado: el chequeo de idempotencia corta antes de
    // llegar al rate limit.
    const retry = await createOrder(form, [{ productId, quantity: 1 }]);
    expect(retry).toEqual(first);
  });

  it("formulario inválido: rechaza sin tocar la base", async () => {
    const { createOrder } = await import("./orders");
    const result = await createOrder({ ...validForm(), email: "no-es-un-email" }, [
      { productId, quantity: 1 },
    ]);
    expect(result.success).toBe(false);

    const allOrders = await db.select().from(schema.orders);
    expect(allOrders).toHaveLength(0);
  });
});
