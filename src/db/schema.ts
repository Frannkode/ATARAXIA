import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    sku: text("sku").notNull().unique(),
    // precioMinorista / precioMayorista: numeric en vez de float para evitar
    // errores de redondeo con dinero. Drizzle los devuelve como string.
    retailPrice: numeric("retail_price", { precision: 10, scale: 2 }).notNull(),
    wholesalePrice: numeric("wholesale_price", { precision: 10, scale: 2 }),
    wholesaleMinQty: integer("wholesale_min_qty"),
    stock: integer("stock").notNull().default(0),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Red de seguridad a nivel DB contra oversell: el UPDATE de stock en
    // createOrder (Historia 2.4) hace `stock = stock - cantidad` sin volver a
    // leer el valor antes — si dos checkouts concurrentes decrementan la
    // misma fila, este constraint es lo que efectivamente rechaza al segundo
    // (Postgres lo evalúa al final del UPDATE, con la fila ya bloqueada).
    check("stock_non_negative", sql`${table.stock} >= 0`),
  ],
);

export const productImages = pgTable("product_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  images: many(productImages),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));

// pendiente_pago: recien creada, stock ya reservado (ver orderItems).
// pagado/rechazado/en_proceso: los conecta el webhook de MercadoPago (Sprint 3).
export const orderStatusEnum = pgEnum("order_status", [
  "pendiente_pago",
  "pagado",
  "rechazado",
  "en_proceso",
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Generado en el cliente al montar el formulario de checkout; un segundo
  // submit con la misma key devuelve la orden existente en vez de crear una
  // duplicada (ver Historia 2.4 y la revision de arquitectura del Sprint 2).
  idempotencyKey: text("idempotency_key").notNull().unique(),
  status: orderStatusEnum("status").notNull().default("pendiente_pago"),
  // Preferencia de pago de MercadoPago (Sprint 3, Historia 3.1). Nullable: no
  // existe hasta el primer POST a /checkout. Un reintento de pago sobre la
  // misma orden reutiliza esta preferencia en vez de crear una nueva en la
  // cuenta de MercadoPago (se regenera solo si MercadoPago la reporta vencida).
  mercadopagoPreferenceId: text("mercadopago_preference_id"),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  // Snapshot del subtotal al momento de crear la orden (no se recalcula
  // sumando orderItems despues, por si estos cambiaran).
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  // FK "restrict" a proposito: los productos nunca se borran fisicamente
  // (soft delete via `active`, Sprint 4), asi que este restrict nunca deberia
  // dispararse — es una red de seguridad, no una restriccion activa.
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  // Snapshot de nombre y precio: si el producto cambia de nombre o precio
  // despues, el pedido conserva lo que el cliente efectivamente compro.
  productName: text("product_name").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
  lineTotal: numeric("line_total", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// Idempotencia del webhook de MercadoPago (Historia 3.2): una fila por
// paymentId procesado. Tabla en vez de una columna en `orders` porque una
// orden puede tener mas de un intento de pago (rechazado y reintentado) y
// una sola columna perderia el historial de intentos previos.
export const processedMercadopagoPayments = pgTable("processed_mercadopago_payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: text("payment_id").notNull().unique(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
});

// Rate limit de createOrder (Historia 2.4, hallazgo de /review): checkout de
// invitado sin gate de pago hasta Sprint 3 + descuento de stock inmediato es
// un vector de agotamiento de inventario sin esto. Ventana deslizante simple:
// una fila por intento, se cuentan las de los ultimos N minutos por IP.
export const orderRateLimitAttempts = pgTable(
  "order_rate_limit_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ipAddress: text("ip_address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_rate_limit_ip_created_at_idx").on(table.ipAddress, table.createdAt)],
);
