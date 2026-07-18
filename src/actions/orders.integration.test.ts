/**
 * Test de integración contra Postgres real — no es mockeable, porque lo que
 * prueba es justamente la garantía de concurrencia de la base (constraint
 * `stock_non_negative` + UPDATE en batch), no la lógica de JS.
 *
 * Se salta automáticamente si no hay TEST_DATABASE_URL configurada (CI sin
 * Postgres disponible, o corrida local sin el flag). Para correrlo:
 *
 *   TEST_DATABASE_URL="postgresql://postgres:devpassword@localhost:5433/kode" npm run test
 */
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { categories, orders, products } from "@/db/schema";

const TEST_DB_URL = process.env.TEST_DATABASE_URL;

describe.skipIf(!TEST_DB_URL)("reserva de stock — concurrencia (integración)", () => {
  const pool = new Pool({ connectionString: TEST_DB_URL });
  const db = drizzle(pool, { schema: { categories, products, orders } });

  let productId: string;

  beforeEach(async () => {
    await db.delete(orders);
    await db.delete(products);
    await db.delete(categories);
    const [category] = await db
      .insert(categories)
      .values({ name: "Test", slug: `test-${Date.now()}` })
      .returning();
    const [product] = await db
      .insert(products)
      .values({
        name: "Producto con 1 unidad",
        slug: `producto-test-${Date.now()}`,
        sku: `TEST-${Date.now()}`,
        retailPrice: "1000.00",
        stock: 1,
        categoryId: category!.id,
      })
      .returning();
    productId = product!.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it("dos decrementos concurrentes por la última unidad: solo uno tiene éxito", async () => {
    const decrement = () =>
      db
        .update(products)
        .set({ stock: sql`${products.stock} - 1` })
        .where(eq(products.id, productId))
        .catch(() => null); // el que pierde la carrera viola stock_non_negative

    const [first, second] = await Promise.all([decrement(), decrement()]);
    const succeeded = [first, second].filter((result) => result !== null);

    expect(succeeded).toHaveLength(1);

    const [finalProduct] = await db.select().from(products).where(eq(products.id, productId));
    expect(finalProduct?.stock).toBe(0);
  });

  it("el UPDATE que rompe stock_non_negative tira DrizzleQueryError con cause.code 23514", async () => {
    // src/actions/orders.ts distingue este código exacto para no confundir
    // "sin stock" con un error real (red, bug, etc.) — esto lo prueba.
    // Drizzle envuelve el error real del driver: el code vive en
    // error.cause.code, NO en error.code directamente (esto rompió en la
    // primera versión de este test, contra el código real).
    await expect(
      db
        .update(products)
        .set({ stock: sql`${products.stock} - 5` })
        .where(eq(products.id, productId)),
    ).rejects.toMatchObject({ cause: { code: "23514" } });
  });

  it("un decremento normal (con stock suficiente) funciona sin problema", async () => {
    await db
      .update(products)
      .set({ stock: sql`${products.stock} - 1` })
      .where(eq(products.id, productId));

    const [finalProduct] = await db.select().from(products).where(eq(products.id, productId));
    expect(finalProduct?.stock).toBe(0);
  });

  it("insertar una orden con idempotencyKey repetida tira cause.code 23505 (unique_violation)", async () => {
    // Prueba el constraint que createOrder usa para detectar la carrera del
    // doble-submit (ver el catch de isIdempotencyConflict en orders.ts): el
    // chequeo SELECT-then-INSERT no es atómico por sí solo, así que la
    // garantía real es este constraint único rechazando el segundo insert.
    const key = `idem-test-${Date.now()}`;
    const baseOrder = {
      idempotencyKey: key,
      customerName: "Test",
      customerEmail: "test@example.com",
      customerPhone: "123",
      shippingAddress: "Calle Falsa 123",
      subtotal: "100.00",
    };

    await db.insert(orders).values(baseOrder);

    await expect(db.insert(orders).values(baseOrder)).rejects.toMatchObject({
      cause: { code: "23505" },
    });
  });
});
