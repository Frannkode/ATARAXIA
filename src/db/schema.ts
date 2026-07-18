import { relations, sql } from "drizzle-orm";
import {
  bigint,
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

// Concepto independiente del estado de pago (Sprint 5, Historia 5.2): una
// orden tiene un solo estado de envio a la vez, igual que el de pago, asi
// que va como columna en la misma tabla (no una tabla de historial aparte).
export const shippingStatusEnum = pgEnum("shipping_status", [
  "preparando",
  "despachado",
  "entregado",
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Generado en el cliente al montar el formulario de checkout; un segundo
  // submit con la misma key devuelve la orden existente en vez de crear una
  // duplicada (ver Historia 2.4 y la revision de arquitectura del Sprint 2).
  idempotencyKey: text("idempotency_key").notNull().unique(),
  status: orderStatusEnum("status").notNull().default("pendiente_pago"),
  // Default "preparando" aunque la orden todavia no este pagada — no es
  // semanticamente valido hasta que status = 'pagado' (el panel admin oculta
  // el estado de envio para ordenes no pagadas, ver Historia 5.1), pero
  // mantenerlo simple como columna con default evita nullability innecesaria.
  shippingStatus: shippingStatusEnum("shipping_status").notNull().default("preparando"),
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

// Auditoria de overrides manuales de estado de pago (Sprint 5, Historia 5.3).
// Solo cubre cambios manuales — las transiciones automaticas (webhook/cron)
// ya tienen su propio rastro en processed_mercadopago_payments + logs.
// changedByUserId se guarda aunque hoy solo haya un admin (Sprint 4): sale
// gratis de requireAdminSession() y queda listo si se suma un segundo admin.
export const orderStatusAuditLog = pgTable("order_status_audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  changedByUserId: text("changed_by_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "restrict" }),
  fromStatus: orderStatusEnum("from_status").notNull(),
  toStatus: orderStatusEnum("to_status").notNull(),
  reason: text("reason"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderStatusAuditLogRelations = relations(orderStatusAuditLog, ({ one }) => ({
  order: one(orders, {
    fields: [orderStatusAuditLog.orderId],
    references: [orders.id],
  }),
}));

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

// --- Better Auth (Sprint 4, Historia 4.1) ---
// Generado con `npx @better-auth/cli generate` — no editar los nombres de
// columna/tabla a mano, el runtime de Better Auth los espera exactos. Un
// solo admin, sin campo de rol (ver decision en el backlog de Sprint 4).
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// storage: "database" del rateLimit de Better Auth (Historia 4.1) — no
// confundir con orderRateLimitAttempts, que es el rate limit de checkout.
export const rateLimit = pgTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
