# Backlog — E-commerce Custom de Indumentaria

**Stack definido (fijo para todo el proyecto — actualizado a 2026):**
- Framework full-stack: Next.js 16 (App Router, Server Actions, React 19) + TypeScript — un único proyecto, sin backend Express separado
- Base de datos: PostgreSQL serverless en Neon (autoscaling + branching para entornos de preview)
- ORM: Drizzle ORM (type-safe, ligero, compatible con edge runtime)
- Pagos: MercadoPago SDK (Checkout Pro + Webhooks/IPN)
- Notificaciones: Resend + React Email (templates de email como componentes React)
- Imágenes: Cloudinary
- Auth admin: Better Auth (sesiones + roles)
- Estado carrito (guest): Zustand + localStorage
- Validación: Zod
- UI: Tailwind CSS v4 + shadcn/ui
- Testing: Vitest + Testing Library (unit/integración), Playwright (E2E)
- Logging/monitoreo: Sentry
- Deploy: Vercel (frontend + funciones serverless/edge) + Neon (base de datos) — un solo proveedor

> Nota de actualización (stack): se reemplazó Express por Route Handlers/Server Actions de Next.js (un solo deploy, menos piezas operativas), Prisma por Drizzle (más liviano y edge-ready), JWT manual por Better Auth (sesiones gestionadas, menos superficie de bugs de seguridad), y Jest/Supertest por Vitest + Playwright (más rápido, nativo ESM, E2E real).
>
> Nota de actualización (secuencia): se movió la aplicación de la paleta de marca del Sprint 6 al Sprint 1 (configurarla desde el arranque es casi gratis; retocarla al final sobre todo el frontend ya construido es caro), y se agregó un spike corto de MercadoPago en el Sprint 1 para descubrir bloqueos de cuenta o de conectividad del webhook antes de llegar al Sprint 3, que es el de mayor riesgo. El total del proyecto se mantiene en 144h / 115 SP; solo se redistribuyeron 2h/1 SP entre el Sprint 1 y el Sprint 6. Ver [Preguntas-Cliente.md](Preguntas-Cliente.md) para las decisiones de negocio pendientes de confirmar.

**Fecha de inicio:** lunes 6 de julio de 2026
**Duración:** 6 sprints semanales (lunes a viernes) — ~160h totales (ver tabla resumen al final del documento para el detalle actualizado por sprint)

---

## Sprint 1 — Setup del proyecto + Catálogo + Ficha de producto

**Objetivo:** Dejar el proyecto corriendo en ambos entornos (dev/staging) con el modelo de datos base y un catálogo navegable (listado, filtro, buscador y ficha expandible).

**Definición de Listo (DoR):**
- Logo del cliente en formato vectorial (SVG/AI) y variantes en PNG
- Paleta de colores exacta (códigos HEX) de lila/negro/gris confirmada por el cliente — se aplica desde este sprint, no se deja para el final
- Al menos 10 productos de muestra con fotos reales (mín. 3 fotos por producto) y descripciones
- Definición de categorías iniciales (nombres y jerarquía si aplica)
- Acceso a repositorio Git (GitHub) creado
- Cuenta de Cloudinary creada (o credenciales para crearla)
- Definición de qué campos tiene un producto (talle, color, SKU, etc.)
- Acceso a una cuenta de MercadoPago del cliente, aunque sea en modo test (necesaria para el spike de la Historia 1.7)

### Historia 1.1 — Setup del proyecto
**Historia:** Como equipo de desarrollo, quiero tener el proyecto configurado con linting, CI básico y entornos, para poder empezar a construir features sin fricción.
**Rol:** Backend / DevOps
**Tareas técnicas:**
- Inicializar proyecto Next.js 16 (App Router) en TypeScript, con estructura de Route Handlers para la API interna
- Configurar Drizzle ORM con conexión a PostgreSQL serverless (Neon) y pooling de conexiones; migraciones iniciales con drizzle-kit
- Configurar Tailwind CSS v4 + shadcn/ui con los tokens de color de marca (lila/negro/gris) definitivos desde el arranque, no placeholders
- Configurar variables de entorno (.env.example) y documentar en README
- Setup de Cloudinary SDK para subida de imágenes
**Dependencias:** Ninguna
**Casos borde:** Falta de credenciales de DB al desplegar → el build de CI debe fallar explícitamente con mensaje claro, no silenciosamente
**Criterio de aceptación:** El proyecto responde en `/api/health` y renderiza una página placeholder, corriendo contra la base de datos de staging en Neon.
**Estimación:** 5h / 3 SP

### Historia 1.2 — Modelo de datos base
**Historia:** Como backend, quiero modelar Producto, Categoría e Imagen en Drizzle, para tener la base de datos que sustenta todo el catálogo.
**Rol:** Backend
**Tareas técnicas:**
- Definir schema Drizzle: `product` (nombre, descripción, SKU, precioMinorista, precioMayorista, cantidadMinimaMayorista, stock, categoriaId, activo), `category`, `productImage`
- Migración inicial con drizzle-kit + seed con los productos de muestra provistos por el cliente
- Route Handler `GET /api/products` y `GET /api/products/:id`
**Dependencias:** Depende de: Setup del proyecto (Historia 1.1)
**Casos borde:** Producto sin imágenes cargadas → debe mostrarse con imagen placeholder, no romper el listado
**Criterio de aceptación:** La API devuelve productos seedeados con su categoría e imágenes asociadas.
**Estimación:** 4h / 2 SP

### Historia 1.3 — Listado de productos con paginación
**Historia:** Como visitante, quiero ver el listado de productos paginado, para poder explorar el catálogo sin que la página se sobrecargue.
**Rol:** Frontend + Backend
**Tareas técnicas:**
- Route Handler `GET /api/products?page=&limit=` con paginación server-side (Drizzle `limit`/`offset`)
- Grid de productos en Next.js (Server Components) con imagen, nombre y precio minorista
- Componente de paginación (o scroll infinito, a definir con cliente)
**Dependencias:** Depende de: Modelo de datos base (Historia 1.2)
**Casos borde:** Catálogo vacío (0 productos) → mostrar estado vacío con mensaje, no un grid roto
**Criterio de aceptación:** El listado carga en páginas de 12 productos sin traer todo el catálogo de una vez.
**Estimación:** 5h / 5 SP

### Historia 1.4 — Filtro por categoría
**Historia:** Como visitante, quiero filtrar productos por categoría, para encontrar más rápido lo que busco.
**Rol:** Frontend + Backend
**Tareas técnicas:**
- Endpoint acepta query param `categoryId`
- Componente de sidebar/dropdown de categorías (fetch de `GET /api/categories`)
- Sincronizar filtro seleccionado con la URL (query string) para permitir compartir el link
**Dependencias:** Depende de: Listado de productos (Historia 1.3)
**Casos borde:** Categoría sin productos activos → mostrar "sin resultados en esta categoría"
**Criterio de aceptación:** Al seleccionar una categoría, el listado se actualiza mostrando solo productos de esa categoría, reflejado en la URL.
**Estimación:** 4h / 3 SP

### Historia 1.5 — Buscador de productos
**Historia:** Como visitante, quiero buscar productos por nombre, para encontrar un artículo específico sin navegar por categorías.
**Rol:** Frontend + Backend
**Tareas técnicas:**
- Endpoint con búsqueda `ILIKE` sobre nombre/descripción (o búsqueda full-text nativa de PostgreSQL si el volumen lo justifica)
- Input de búsqueda con debounce (300-500ms) en frontend
- Combinar búsqueda + filtro de categoría en la misma query
**Dependencias:** Depende de: Listado de productos (Historia 1.3)
**Casos borde:** Búsqueda sin resultados → mensaje claro; búsqueda con caracteres especiales (SQL injection) → sanitizada por Drizzle (parametrizado) y validada con Zod
**Criterio de aceptación:** Buscar un término devuelve solo productos cuyo nombre o descripción lo contienen, sin recargar la página.
**Estimación:** 4h / 3 SP

### Historia 1.6 — Ficha de producto expandible
**Historia:** Como visitante, quiero ver una ficha de producto con galería de fotos e información detallada, para decidir mi compra con confianza.
**Rol:** Frontend + Backend
**Tareas técnicas:**
- Route Handler `GET /api/products/:id` con todas las imágenes asociadas
- Componente de galería (miniatura + imagen principal ampliable, tipo lightbox)
- Sección de información detallada (talles disponibles, composición, descripción larga)
**Dependencias:** Depende de: Modelo de datos base (Historia 1.2)
**Casos borde:** Producto con una sola imagen → galería debe funcionar igual sin errores; producto inactivo/eliminado accedido por link directo → página 404 amigable
**Criterio de aceptación:** Al entrar a un producto se ve la galería completa navegable y toda su información, incluso desde un link directo.
**Estimación:** 6h / 5 SP

### Historia 1.7 — Spike de validación de MercadoPago
**Historia:** Como equipo de desarrollo, quiero validar temprano el acceso a la cuenta de MercadoPago del cliente y la conectividad del webhook, para no descubrir bloqueos de cuenta o de red recién en el Sprint 3 (el de mayor riesgo del proyecto).
**Rol:** Backend
**Tareas técnicas:**
- Verificar acceso a credenciales de test (Access Token, Public Key) de la cuenta del cliente
- Crear una preferencia de pago mínima de prueba contra la API de MercadoPago
- Exponer un endpoint de webhook de prueba vía túnel local (o preview deploy de Vercel) y confirmar que MercadoPago logra alcanzarlo
**Dependencias:** Depende de: Setup del proyecto (Historia 1.1); requiere cuenta de MercadoPago en el DoR
**Casos borde:** Cuenta del cliente sin verificar o sin permisos para generar credenciales de test → escalar con el cliente de inmediato, antes de que bloquee el Sprint 3
**Criterio de aceptación:** Se genera y cobra una preferencia de prueba de punta a punta en sandbox, y el webhook de prueba recibe la notificación correspondiente.
**Estimación:** 2h / 1 SP

### Testing Sprint 1
**Tarea:** Tests unitarios de Route Handlers de catálogo (listado, filtro, búsqueda, ficha) con Vitest, y test de render de componentes clave (grid, galería) con Vitest + Testing Library.
**Rol:** Backend / Frontend
**Criterio de aceptación:** Suite de tests corre en verde en CI, cubriendo casos borde de catálogo vacío y producto sin imágenes.
**Estimación:** 4h / 2 SP

**Definición de Hecho del Sprint:**
- [ ] Código mergeado a `main`/`develop` sin romper CI
- [ ] Catálogo, filtro, buscador y ficha funcionando en ambiente de staging
- [ ] Seed de productos reales cargado
- [ ] Tests de catálogo en verde
- [ ] Demo grabada/realizada al cliente

**Recortables si el sprint se atrasa:**
- No recortable: Modelo de datos, Listado de productos (base de todo lo demás)
- Recortable a Sprint 2: Buscador (puede vivir sin él una semana más si el filtro por categoría cubre la necesidad mínima)

**Demo al cliente:** Navegar el catálogo en staging, filtrar por categoría, buscar un producto por nombre y abrir la ficha de un producto viendo sus múltiples fotos.

**Total Sprint 1:** 34h / 24 SP

---

## Sprint 2 — Precios mayorista/minorista + Carrito + Checkout sin registro

**Objetivo:** Permitir que un visitante arme un pedido con precios diferenciados según cantidad y complete un checkout sin necesidad de crear cuenta.

**Definición de Listo (DoR):**
- Reglas de negocio de mayorista definidas por el cliente: cantidad mínima para precio mayorista, si aplica por producto o por pedido total
- Campos de envío requeridos definidos (dirección, localidad, CP, teléfono; si hay retiro en local como opción)
- Definición de si el envío tiene costo fijo, variable o se coordina aparte (impacta el checkout)

### Historia 2.1 — Modelo de precios mayorista/minorista
**Historia:** Como backend, quiero que cada producto tenga precio minorista y mayorista con una cantidad mínima de activación, para soportar ambos tipos de venta desde el mismo catálogo.
**Rol:** Backend
**Tareas técnicas:**
- ~~Extender schema de `product`~~ — ya existe desde la Historia 1.2 (`retailPrice`, `wholesalePrice`, `wholesaleMinQty`), no hay tarea de migración acá.
- `src/lib/pricing.ts` con `calculateLineItem(product, cantidad)`: convierte `retailPrice`/`wholesalePrice` a `Number` explícitamente al entrar (Drizzle los devuelve como **string** por ser columnas `numeric`) y calcula todo en `number`; solo se vuelve a convertir a string al persistir en `orderItem` (Historia 2.4). La conversión vive en un único lugar (esta función), no se repite en cada componente que toca precios.
- Instalar **Vitest** (elegido en el stack desde el Sprint 1, nunca instalado — no hay un solo test en el repo todavía): `vitest.config.ts` + primer test suite para esta función.
**Dependencias:** Depende de: Modelo de datos base — Sprint 1
**Casos borde:** Producto sin precio mayorista configurado → se usa minorista sin importar cantidad; cantidad exactamente igual al mínimo mayorista → debe aplicar el precio mayorista (regla ">=", no ">"); cantidad ≤ 0 → rechazar antes de calcular
**Tests requeridos (Vitest, sin DB — función pura):** qty < mínimo → minorista; qty === mínimo (boundary) → mayorista; qty > mínimo → mayorista; sin `wholesalePrice` configurado → siempre minorista; qty ≤ 0 → rechaza
**Criterio de aceptación:** Al calcular el precio de un producto con cantidad ≥ mínimo mayorista, la función devuelve el precio mayorista correcto, con los 5 casos de arriba cubiertos por tests.
**Estimación:** 5h / 5 SP

### Historia 2.2 — Cálculo de precio dinámico en frontend
**Historia:** Como comprador, quiero ver cómo cambia el precio a medida que modifico la cantidad, para entender cuándo conviene comprar mayorista.
**Rol:** Frontend
**Tareas técnicas:**
- Selector de cantidad en la ficha de producto (client component) con indicador visual ("A partir de X unidades, precio mayorista")
- Server Action que llama a `calculateLineItem` (Historia 2.1) para el preview — no se calcula en el cliente, evita desincronización. Es la misma función que después usa el checkout, no una segunda implementación.
**Dependencias:** Depende de: Modelo de precios (Historia 2.1)
**Casos borde:** Usuario ingresa cantidad 0 o negativa → input bloqueado/validado; falla la Server Action (red) → mostrar estado de error en el preview, no romper la página
**Tests requeridos:** cantidad inválida bloquea el input (component test); preview refleja el mismo valor que devuelve `calculateLineItem` (evita que el preview y el cálculo real diverjan)
**Criterio de aceptación:** El precio mostrado en pantalla siempre coincide con el que calcula la misma función `calculateLineItem` al agregar al carrito.
**Estimación:** 4h / 3 SP

### Historia 2.3 — Carrito de compras
**Historia:** Como comprador, quiero agregar, quitar y modificar cantidades de productos en un carrito, para armar mi pedido antes de pagar.
**Rol:** Frontend
**Tareas técnicas:**
- Store de carrito con Zustand persistido en localStorage. Guarda **solo `{ productId, cantidad }`**, nunca una copia del producto (nombre/precio/imagen) — evita que el carrito muestre datos viejos si el producto cambió o se desactivó.
- `getProductsByIds(ids)` en `src/db/queries/products.ts`: query batcheada (`inArray`, no un loop de `getProductById`) que trae los productos del carrito. A diferencia de `getProducts()`/`getProductById()`, **no filtra por `active`** — necesita traer productos desactivados igual para poder mostrar su nombre en el aviso "ya no está disponible" en vez de un item fantasma sin info.
- `validateCartItems(items)` compartida (`src/lib/cart-validation.ts`): decide si cada item es válido (existe + activo + stock suficiente). La usa tanto el componente de carrito (para mostrar avisos) como el checkout (Historia 2.4, para bloquear el submit) — una sola regla de "qué es inválido", no dos versiones que puedan divergir.
- Componente de carrito (drawer o página) con edición de cantidades y eliminación de ítems
- Recalcular precio total (incluyendo saltos mayorista/minorista, vía `calculateLineItem` de la Historia 2.1) en cada cambio
**Dependencias:** Depende de: Cálculo de precio dinámico (Historia 2.2)
**Casos borde:** Producto en el carrito que fue desactivado/eliminado del catálogo mientras el usuario navegaba → `validateCartItems` lo marca inválido, se muestra con su nombre (gracias a que `getProductsByIds` no filtra por active) y se bloquea el checkout hasta que se remueva; stock insuficiente para la cantidad en carrito → aviso y ajuste sugerido; carrito con productos agregados hace semanas cuyo ID ya no existe en la base → tratado igual que "ya no disponible", no rompe el render
**Tests requeridos:** `validateCartItems` — producto inexistente → inválido; producto inactivo → inválido (con nombre disponible); stock < cantidad → inválido con cantidad sugerida; todo OK → válido. `getProductsByIds` — array vacío → resultado vacío sin query; IDs mixtos (activos + inactivos) → trae todos
**Criterio de aceptación:** El carrito persiste entre recargas de página, refleja el precio correcto ante cualquier cambio de cantidad, y un producto inválido se muestra identificado por nombre en vez de como item fantasma.
**Estimación:** 5h / 5 SP

### Historia 2.4 — Checkout sin registro
**Historia:** Como comprador, quiero completar mi compra dejando solo mis datos de contacto y envío, para no tener que crear una cuenta.
**Rol:** Frontend + Backend
**Tareas técnicas:**
- Formulario de checkout (nombre, email, teléfono, dirección de envío) validado con Zod
- Modelo `order` y `orderItem` en Drizzle. `order` incluye una columna `idempotencyKey` (única) además del estado (`pendiente_pago`/`pagado`/`rechazado`/`en_proceso`).
- **Server Action** `createOrder` (no un Route Handler REST — nada más lo consume que este formulario): revalida los cart items server-side con `validateCartItems` (Historia 2.3, no confía en lo que mandó el cliente), y crea la orden + `orderItem`s con **snapshot de precios ya convertidos a string** (el `Number` de `calculateLineItem` se vuelve a convertir al persistir).
- **Reserva de stock atómica y segura ante concurrencia:** `UPDATE products SET stock = stock - $cantidad WHERE id = $id AND stock >= $cantidad` dentro de la misma transacción que crea la orden. Postgres bloquea la fila en el `UPDATE`, así que dos compras concurrentes por la última unidad se serializan solas — la segunda ve el `WHERE` fallar y la orden no se crea. (Un `BEGIN/COMMIT` sin este `WHERE` NO alcanza: dos transacciones pueden leer el mismo stock antes de que ninguna commitee.)
- **Idempotency key contra doble-submit:** el formulario genera un UUID al montarse (campo oculto). `createOrder` lo guarda en `idempotencyKey` (columna única); un segundo submit con la misma key devuelve la orden ya creada en vez de crear una segunda. Necesario porque el stock ya se descuenta acá (no en Sprint 3): sin esto, un doble-click o un retry de red con conexión inestable puede generar dos órdenes que restan stock real por una sola compra que ni siquiera pagó todavía.
- Página `/pedidos/[id]` (nueva): confirmación post-checkout con el resumen del pedido y estado "pendiente de pago" — placeholder hasta que el Sprint 3 conecte el redirect real a MercadoPago. Sin esto, "completar un checkout de punta a punta" (ver Demo al cliente, abajo) se corta en la nada.
**Dependencias:** Depende de: Carrito (Historia 2.3)
**Casos borde:** Email inválido o campos vacíos → validación bloqueante con mensajes claros; doble submit del formulario (doble click, o retry de red) → resuelto por la `idempotencyKey`, no solo por deshabilitar el botón en el cliente; stock se agota entre que el usuario ve el carrito y aprieta "confirmar" → el `UPDATE ... WHERE stock >= cantidad` no actualiza filas, la orden no se crea, se muestra error claro
**Tests requeridos:** `createOrder` con stock suficiente → crea orden + descuenta stock; dos llamadas concurrentes por la última unidad → solo una crea orden (test de integración contra Postgres real, no mockeable); mismo `idempotencyKey` dos veces → devuelve la misma orden, no crea una segunda; cart item inválido al momento del submit → rechaza sin crear orden parcial
**Criterio de aceptación:** Un visitante sin cuenta puede completar el formulario y generar un pedido en estado pendiente con el stock ya reservado, sin poder duplicar la orden con un doble-submit, y cae en una página de confirmación real.
**Estimación:** 9h / 8 SP

### Testing Sprint 2
**Tarea:** Setup de Vitest (config + primer test) y suite completa: `calculateLineItem` (tabla de boundary cases), `validateCartItems`, y un test de integración contra Postgres real para `createOrder` cubriendo el caso de dos llamadas concurrentes por la última unidad de stock (no es mockeable — la garantía es del `WHERE` de Postgres, no de la lógica de JS).
**Rol:** Backend
**Criterio de aceptación:** Suite verde cubriendo los saltos de precio, la creación de orden con snapshot correcto de precios, y el test de concurrencia de stock.
**Estimación:** 6h / 3 SP

**Definición de Hecho del Sprint:**
- [ ] Flujo completo carrito → checkout → orden creada funcionando en staging
- [ ] Precios mayorista/minorista validados con casos límite
- [ ] Vitest instalado y la suite completa en verde (incluyendo el test de concurrencia de stock)
- [ ] Doble-submit del checkout probado manualmente sin generar orden duplicada
- [ ] Demo al cliente realizada

**Recortables si el sprint se atrasa:**
- No recortable: Modelo de precios, Checkout sin registro, reserva atómica de stock, idempotency key (dejó de ser "nice to have" en la revisión de arquitectura: sin esto el checkout sin cuenta puede duplicar órdenes que restan stock real)
- Recortable a Sprint 3: Indicador visual de "precio mayorista a partir de X" (puede lanzarse con precio recalculado sin el mensaje explicativo)

**Demo al cliente:** Agregar productos al carrito en distintas cantidades viendo el salto a precio mayorista, y completar un checkout de punta a punta sin loguearse, cayendo en una página de confirmación del pedido.

**Total Sprint 2:** 29h / 24 SP

> **Nota de revisión de arquitectura (`/plan-eng-review`):** este sprint pasó por una revisión de arquitectura antes de implementarse. Se removió una tarea redundante (el schema de precios ya existía), se consolidó el cálculo de precio en una sola función en vez de un endpoint REST separado, y una revisión cruzada independiente encontró 5 vacíos reales que cambiaron el plan: manejo de precios como string (Drizzle + `numeric`), la necesidad de un `WHERE` condicional para que la reserva de stock sea realmente segura ante concurrencia (no alcanza con "una transacción"), que `getProductsByIds` no debe filtrar productos inactivos, que la falta de idempotencia en el checkout pasó de "gap aceptable" a requisito duro dado que ya se reserva stock real sin pago confirmado, y la necesidad de dejar la liberación de stock por abandono como requisito explícito del Sprint 3 (ver nota ahí). El total subió de 24h/20 SP a 29h/24 SP por esto — principalmente la idempotency key y la página de confirmación de pedido.

---

## Sprint 3 — Integración MercadoPago + Webhooks + Notificaciones automáticas

**Objetivo:** Cobrar automáticamente vía MercadoPago y notificar al cliente el estado de su pedido sin intervención manual.

**Definición de Listo (DoR):**
- Cuenta de MercadoPago del cliente creada (aunque sea en modo test inicialmente) con Access Token y Public Key
- Definición de qué pasa si el pago es rechazado (¿se libera el stock reservado? ¿se avisa al cliente para reintentar?)
- Cuenta de Resend (o dominio verificado para envío de emails) creada
- Definición de textos de los emails transaccionales (confirmación, rechazo) — al menos un borrador del cliente

### Historia 3.1 — Integración Checkout Pro de MercadoPago
**Historia:** Como comprador, quiero ser redirigido a MercadoPago para pagar mi pedido, para completar la compra de forma segura.
**Rol:** Backend
**Tareas técnicas:**
- Integrar SDK oficial de MercadoPago (`mercadopago` npm), crear preferencia de pago (`items`, `external_reference` = orderId, `back_urls`, `notification_url`)
- Columna nueva `mercadopagoPreferenceId` (nullable) en `orders`. Un reintento de pago sobre una orden `pendiente_pago` reutiliza la preferencia guardada en vez de crear una nueva en la cuenta de MercadoPago; si la preferencia guardada ya expiró (ver caso borde), se genera una nueva y se reemplaza.
- `excluded_payment_types` en la preferencia para deshabilitar métodos offline (ticket/efectivo/transferencia — Rapipago, Pago Fácil, etc.): solo tarjeta y dinero en cuenta de MercadoPago, que confirman en minutos. Necesario para que la expiración por abandono (Historia 3.3) sea una asunción válida — un pago en efectivo puede tardar 1-3 días en acreditarse y la reserva de stock no puede esperar eso.
- Route Handler `POST /api/orders/:id/checkout` que genera (o reutiliza) la preferencia y devuelve el link de pago
- La página de confirmación (`/pedidos/[id]`) **nunca** debe leer el resultado del pago desde los query params del `back_url` de retorno — siempre lee el estado real desde la DB (ya es así por construcción desde Sprint 2, pero es una restricción explícita a no romper en la implementación: el back_url es alcanzable por el usuario y llega antes que el webhook).
**Dependencias:** Depende de: Checkout sin registro — Sprint 2
**Casos borde:** Usuario abandona el pago en MercadoPago (no vuelve) → la orden queda `pendiente_pago` con expiración configurable (ver Historia 3.3); usuario vuelve y reintenta pago sobre la misma orden → reutilizar preferencia guardada, regenerándola solo si MercadoPago la reporta expirada
**Criterio de aceptación:** Al confirmar el checkout, el comprador es redirigido a MercadoPago con el monto y los ítems correctos, sin métodos de pago offline disponibles.
**Estimación:** 8h / 7 SP

### Historia 3.2 — Webhook de confirmación de pago (IPN)
**Historia:** Como sistema, quiero recibir la notificación de MercadoPago cuando un pago se aprueba, rechaza o queda pendiente, para actualizar el pedido automáticamente.
**Rol:** Backend
**Tareas técnicas:**
- Route Handler `POST /api/webhooks/mercadopago`: valida el header `x-signature` (HMAC, con el body crudo + `data.id` + `ts`, documentado por MercadoPago) antes de tocar la DB o llamar a la API de pagos — rechaza con 401 cualquier request que no venga de MercadoPago. Cierra un vector de abuso/costo (requests falsos disparando llamadas reales a la API de MercadoPago), no de fraude (el fraude ya lo cierra "consultar el pago real").
- Filtrar por `topic`/`type`: MercadoPago manda notificaciones de `payment` Y de `merchant_order` — el handler solo procesa `type=payment` e ignora (200, no-op) las de `merchant_order`.
- Consulta el pago real vía API de MercadoPago usando el `payment_id` del body (nunca confiar en el `status` que venga en el payload)
- Idempotencia: tabla nueva `processed_mercadopago_payments` (`paymentId` unique, `orderId`, `status`, `processedAt`). Un `paymentId` repetido choca contra el unique constraint (mismo patrón que `idempotencyKey` de `orders`, Sprint 2) y el handler responde 200 sin reprocesar. Una tabla en vez de una columna en `orders` porque una orden puede tener más de un intento de pago (rechazado y reintentado) y perdería el historial con una sola columna.
- Llama a la función compartida `applyPaymentResult(orderId, mpStatus, mpPaymentId)` (ver Historia 3.3) para aplicar el resultado — el webhook NO implementa su propia lógica de transición de estado/liberación de stock, la comparte con el cron de reconciliación.
- El trabajo (consultar la API + actualizar la DB) se hace de forma síncrona antes de responder 200 — es el propio objetivo del webhook, no una operación que se pueda diferir sin perder la confirmación si la función serverless se corta post-respuesta. Solo el envío de email (Historia 3.4) puede diferirse de forma no bloqueante.
**Dependencias:** Depende de: Integración Checkout Pro (Historia 3.1)
**Casos borde:** Webhook duplicado (MercadoPago reintenta si no responde 200 a tiempo) → idempotencia por `paymentId` vía la tabla `processed_mercadopago_payments`; webhook con `external_reference` inexistente → loggear y responder 200 igual para no generar reintentos infinitos. *(Se sacó el caso borde "webhook llega antes de que la orden exista en DB": en esta arquitectura la orden se crea sincrónicamente en Sprint 2 antes de que exista ninguna preferencia de MercadoPago, así que ese race es estructuralmente imposible.)*
**Criterio de aceptación:** Un pago aprobado en MercadoPago actualiza el estado de la orden en la base de datos en menos de 10 segundos, sin duplicar procesamiento ante reintentos del webhook, y rechaza webhooks con firma inválida.
**Estimación:** 8h / 10 SP

### Historia 3.3 — Actualización automática de estado de pedido
**Historia:** Como administrador, quiero que el estado del pedido refleje automáticamente el resultado del pago, para no tener que verificar manualmente en MercadoPago.
**Rol:** Backend
**Tareas técnicas:**
- Máquina de estados de `order`: `pendiente_pago` / `en_proceso` (no terminales) → `pagado` / `rechazado` (terminales). El enum `order_status` ya existe desde Sprint 2, no hace falta migración nueva para los valores en sí.
- Función compartida `applyPaymentResult(orderId, mpStatus, mpPaymentId)` (reusada por el webhook — Historia 3.2 — y por el cron de este historia), que hace en un solo `db.batch()`:
  - `UPDATE orders SET status=? WHERE id=? AND status NOT IN ('pagado','rechazado')` (0 filas afectadas = la orden ya estaba en un estado terminal, no-op — protege contra doble-procesamiento del webhook y el cron corriendo casi al mismo tiempo). El guard es `NOT IN (pagado, rechazado)`, no `= pendiente_pago`: `en_proceso` sigue siendo un estado abierto que puede resolver a `pagado` o `rechazado` más tarde, y con un guard más estricto esa resolución final se perdería silenciosamente.
  - Si el resultado es rechazo: `UPDATE products SET stock = stock + cantidad FROM orders WHERE orders.id = orderId AND orders.status NOT IN ('pagado','rechazado') AND products.id = ...` — el UPDATE de stock lleva la MISMA condición correlacionada con el estado de la orden, no solo el UPDATE de `orders`. Sin esto, dos ejecuciones concurrentes (webhook + cron reconciliando casi al mismo tiempo) pueden liberar el mismo stock dos veces aunque el cambio de estado de la orden sí quede protegido — el guard debe cubrir cada UPDATE del batch, no solo uno.
  - El stock **ya se descontó al crear la orden** (Sprint 2, Historia 2.4). Un pago aprobado no toca stock, ya está reservado desde el checkout.
- Cron de reconciliación (backstop del webhook): dado que el proyecto corre en **Vercel Hobby** (solo permite 1 cron nativo diario, insuficiente para liberar stock de órdenes abandonadas en minutos/horas), se usa un servicio externo gratuito (ej. cron-job.org) pegándole cada 15 minutos a `GET /api/cron/expire-orders`, protegido con un `CRON_SECRET` (bearer token) — mismo mecanismo que usaría Vercel Cron nativo, solo que disparado externamente. El endpoint busca órdenes `pendiente_pago`/`en_proceso` con más de X minutos de antigüedad, confirma el estado real contra la API de MercadoPago, y llama a `applyPaymentResult`.
**Dependencias:** Depende de: Webhook (Historia 3.2); depende de la reserva de stock en la creación de la orden — Sprint 2, Historia 2.4; depende de que Historia 3.1 excluya métodos de pago offline (si no, la expiración por minutos/horas libera stock de compras en efectivo legítimas que todavía no se acreditaron)
**Casos borde:** Pago aprobado pero el stock de esa orden ya no cuadra (ajuste manual de inventario u otra causa excepcional) → marcar orden para revisión manual, no fallar silenciosamente; el cron corre dos veces sobre la misma orden, o corre casi al mismo tiempo que el webhook → idempotente por construcción (el guard `NOT IN (pagado,rechazado)` cubre tanto el cambio de estado como la liberación de stock, ver arriba); orden en `en_proceso` que MercadoPago tarda en resolver → sigue siendo detectada por el cron hasta que llegue a un estado terminal
**Criterio de aceptación:** Toda orden rechazada o expirada libera el stock reservado exactamente una vez, incluso si el webhook y el cron la procesan casi al mismo tiempo; una orden `pendiente_pago`/`en_proceso` de más de X minutos sin resolución es detectada y liberada automáticamente por el cron externo, sin intervención manual.
**Estimación:** 9h / 8 SP

### Historia 3.4 — Notificación automática al cliente
**Historia:** Como comprador, quiero recibir un email cuando mi pago fue procesado, para saber si mi pedido está confirmado.
**Rol:** Backend
**Tareas técnicas:**
- Integrar Resend + React Email para envío y diseño de emails transaccionales
- Templates de email (componentes React): pago aprobado, pago rechazado
- Disparar envío desde `applyPaymentResult` (Historia 3.3), de forma no bloqueante (el envío no debe demorar la respuesta al webhook — es la única parte del flujo que puede diferirse)
- Extraer helper `getPostgresErrorCode(error)` en `src/lib/db-errors.ts` (saca `error.cause.code` de un `DrizzleQueryError` de forma segura) y reusarlo tanto en el código nuevo de este sprint como en `src/actions/orders.ts` (Sprint 2), que ya repetía este patrón dos veces — este sprint agrega un tercer lugar que lo necesita.
**Dependencias:** Depende de: Actualización automática de estado (Historia 3.3)
**Casos borde:** Falla el envío de email (proveedor caído) → se loggea el error (orderId + motivo) sin bloquear ni revertir la actualización del pedido ya aplicada; sin reintento automático ni cola — es una pieza de infraestructura entera para un caso raro en una tienda chica, el reenvío manual queda para el panel admin (Sprint 4)
**Criterio de aceptación:** Al aprobarse o rechazarse un pago, el comprador recibe un email automático en menos de 1 minuto.
**Estimación:** 5h / 5 SP

### Testing Sprint 3
**Tarea:** Simulación de pagos en ambiente sandbox de MercadoPago (aprobado, rechazado, pendiente) verificando actualización de orden, descuento/liberación de stock y disparo de email correspondiente, con tests de integración en Vitest. Incluir test de webhook duplicado, y un test de integración contra Postgres real que dispare `applyPaymentResult` dos veces "casi concurrentemente" sobre la misma orden (webhook + cron simulados) para probar que ni el estado ni el stock se duplican — mismo patrón que los tests de concurrencia de Historia 2.4.
**Rol:** Backend
**Criterio de aceptación:** Los 3 escenarios de pago (aprobado/rechazado/pendiente) se comportan correctamente en sandbox, un webhook reenviado dos veces no duplica efectos, y una ejecución concurrente de webhook+cron sobre la misma orden libera el stock exactamente una vez.
**Estimación:** 7h / 5 SP

### Riesgos (específico de este sprint)

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Ambiente test vs producción de MercadoPago usan credenciales distintas y a veces comportamiento distinto | Un flujo que funciona en sandbox falla en producción | Probar explícitamente con credenciales de producción en modo real antes del cierre del sprint 6, no solo en sandbox |
| Reintentos de webhook por timeout (MP reintenta si no responde 200 rápido) | Procesamiento duplicado de un mismo pago | Responder 200 solo después de aplicar el resultado (síncrono, ver Historia 3.2); idempotente por `paymentId` vía `processed_mercadopago_payments` de todas formas, así que un reintento nunca duplica efectos aunque tarde |
| Notificación de pago que nunca llega (webhook perdido) | Orden queda "pendiente" eternamente aunque el pago se acreditó | Cron externo cada 15 min (cron-job.org, dado el límite de Vercel Hobby) que consulta el estado real de pagos pendientes vía API de MercadoPago, como respaldo del webhook |
| Confusión entre `external_reference` y `payment_id` al validar el webhook | Actualizar la orden incorrecta o no encontrarla | Siempre consultar el pago completo por `payment_id` contra la API de MercadoPago antes de actuar, nunca confiar en el body crudo del POST |
| Discrepancia de monto entre lo cobrado y el pedido (manipulación del front) | Pérdida económica | Recalcular el monto en backend a partir de los ítems de la orden al crear la preferencia, nunca aceptar un monto enviado por el cliente |
| Cold start de funciones serverless demorando la respuesta al webhook | MercadoPago podría reintentar si la respuesta tarda demasiado | Mantener el Route Handler del webhook liviano en todo lo que no sea la confirmación del pago en sí; solo el email se difiere |
| Métodos de pago offline (efectivo/transferencia) tardan días en acreditarse | Expiración por minutos/horas liberaría stock de compras legítimas en curso | `excluded_payment_types` en la preferencia (Historia 3.1): solo tarjeta y dinero en cuenta |
| Endpoint del cron de reconciliación sin autenticación | Cualquiera podría dispararlo y forzar reconciliaciones arbitrarias | `CRON_SECRET` como bearer token, igual que protegería un cron nativo de Vercel |

**Definición de Hecho del Sprint:**
- [ ] Pago completo probado en sandbox: aprobado, rechazado y pendiente
- [ ] Webhook idempotente y sin duplicar efectos ante reintentos, con firma validada
- [ ] Cron externo de reconciliación corriendo cada 15 min contra `/api/cron/expire-orders`, protegido por `CRON_SECRET`
- [ ] Emails de confirmación/rechazo llegando correctamente
- [ ] Stock se descuenta/libera correctamente según resultado del pago, incluso bajo ejecución concurrente webhook+cron
- [ ] Demo al cliente realizada

**Recortables si el sprint se atrasa:**
- No recortable: Webhook + actualización de estado de orden + liberación de stock (es el corazón del sistema de cobro; sin esto hay riesgo real de sobreventa/inventario fantasma)
- Recortable a Sprint 4: Email de "pago pendiente/en proceso" (dejar solo aprobado/rechazado, que son los casos más frecuentes)

**Demo al cliente:** Completar una compra de punta a punta pagando con una tarjeta de test de MercadoPago y mostrar cómo el pedido cambia de estado automáticamente y llega el email de confirmación.

> **Nota de revisión de arquitectura (`/plan-eng-review`):** revisado antes de implementarse. La revisión propia encontró 6 vacíos de arquitectura (dónde vive el `preferenceId` para reutilizar preferencias, cómo se modela la idempotencia del webhook, extracción de `applyPaymentResult` compartido entre webhook y cron, el guard con `UPDATE` condicional para liberación de stock idempotente, validación de firma del webhook, y un caso borde obsoleto que se sacó del backlog) y 2 de calidad de código (extracción de `getPostgresErrorCode`, política de fallo de email sin cola de reintentos). Una revisión cruzada independiente (outside voice) encontró **2 bugs reales** en las propias decisiones de esta revisión — el `UPDATE` de liberación de stock no quedaba protegido por el mismo guard que la orden (podía liberarse dos veces), y el guard trataba `en_proceso` como estado terminal cuando no lo es — ambos corregidos antes de implementar. También encontró una restricción de plataforma no contemplada (Vercel Hobby solo permite cron diario, resuelto con un cron externo cada 15 min) y un vacío de negocio (métodos de pago offline de MercadoPago tardan días en acreditarse, resuelto excluyéndolos de la preferencia). El total subió de 28h/26 SP a 37h/35 SP por esto — principalmente Historia 3.2 (tabla de idempotencia + firma) e Historia 3.3 (función compartida + guards corregidos + cron externo).

**Total Sprint 3:** 37h / 35 SP

> **Nota:** +2h/+2 SP respecto de la estimación original — la Historia 3.3 pasó de "liberar stock si expira" (vago) a un job periódico concreto con criterio de aceptación propio, encontrado necesario en la revisión de arquitectura del Sprint 2 (ver nota ahí).

---

## Sprint 4 — Panel admin: login + CRUD de productos

**Objetivo:** Dar al personal autorizado un panel privado para gestionar el catálogo (precios, descripciones, categorías) sin tocar la base de datos directamente.

**Definición de Listo (DoR):**
- ~~Lista de usuarios administradores iniciales~~ — Resuelto: un solo admin (`poncefrancomiguel@gmail.com`), un solo nivel de permiso. Sin infraestructura de roles por ahora (ver nota de revisión de arquitectura abajo).
- Panel admin en la ruta `/admin` del mismo dominio (por defecto, salvo que se indique lo contrario antes del deploy).

### Historia 4.1 — Login de administrador
**Historia:** Como administrador, quiero iniciar sesión con mi usuario y contraseña, para acceder al panel de gestión de forma segura.
**Rol:** Backend
**Tareas técnicas:**
- Configurar Better Auth con proveedor de email + contraseña para el acceso admin
- **Conexión separada solo para Better Auth** vía `drizzle-orm/neon-serverless` (WebSocket) — el `db` principal de la app (Sprint 1-3) sigue usando `neon-http` + `db.batch()` sin tocarse. Better Auth necesita transacciones reales para crear usuarios/sesiones (bug conocido y reportado contra `neon-http`, ver GitHub issue #4747 de better-auth), y `neon-http` no las soporta. Cambio quirúrgico acotado a lo nuevo, cero riesgo de regresión en código ya testeado.
- Rate limiting de intentos de login respaldado en la propia Postgres (opción nativa de Better Auth), no en memoria (inútil en serverless) ni en un servicio externo nuevo (Redis/Upstash) — mismo espíritu que `orderRateLimitAttempts` de Sprint 2.
- Sin tabla/campo de roles: un solo nivel de permiso hoy, cualquier sesión válida de Better Auth tiene acceso total. Se agrega infraestructura de roles recién si aparece un segundo nivel de permiso real.
- Bootstrap de la cuenta inicial: script de seed separado (no una ruta de registro pública) que llama a la API server-side de Better Auth una sola vez con el email/contraseña elegidos. La página de login solo expone el formulario de inicio de sesión — nunca existe una ruta de registro.
- Configurar expiración/rotación de sesión y flujo de logout
**Dependencias:** Ninguna (independiente del resto del sistema)
**Casos borde:** Intentos de login fallidos repetidos → rate limiting respaldado en DB; sesión expirada → el frontend debe redirigir a login, no mostrar un panel roto
**Criterio de aceptación:** El admin puede loguearse y su sesión persiste vía cookie segura; credenciales incorrectas son rechazadas con mensaje genérico (sin revelar si el email existe).
**Estimación:** 6h / 6 SP

### Historia 4.2 — Protección de rutas y Server Actions admin
**Historia:** Como sistema, quiero que ninguna ruta, página ni Server Action del panel sea accesible sin una sesión válida, para proteger la información sensible del negocio.
**Rol:** Backend
**Tareas técnicas:**
- `src/proxy.ts` (Next.js 16 renombró `middleware.ts` a `proxy.ts` y lo redujo a un "thin proxy", no pensado para chequeos pesados de sesión contra la DB): usa `getSessionCookie()` de Better Auth (chequeo liviano de presencia de cookie, sin golpear la base) para redirigir a `/admin/login` si no hay cookie de sesión.
- Helper compartido `requireAdminSession()` (llama a `auth.api.getSession()`, la validación real contra la DB) — **se llama en dos lugares, no solo uno**: (a) cada Server Action de admin, y (b) el layout de `/admin` (Server Component), ya que las páginas del panel (listado de productos, y en Sprint 5 el detalle de pedidos con PII del comprador) se renderizan leyendo la base directo, sin pasar por ninguna Server Action — sin este segundo chequeo, el proxy liviano quedaría como única defensa para esas lecturas, exactamente la falla de capa única que este historia busca evitar.
- Sin verificación de rol (no aplica, un solo nivel de permiso — ver Historia 4.1).
**Dependencias:** Depende de: Login de administrador (Historia 4.1)
**Casos borde:** Acceso directo por URL a una ruta admin sin sesión → redirección a login, no error 500
**Criterio de aceptación:** Ninguna página ni Server Action del panel admin responde datos sin una sesión válida.
**Estimación:** 4h / 3 SP

### Historia 4.3 — CRUD de productos en panel admin
**Historia:** Como administrador, quiero editar precio, descripción, stock e imágenes de un producto, para mantener el catálogo actualizado sin depender de un desarrollador.
**Rol:** Frontend + Backend
**Tareas técnicas:**
- Server Actions de admin (crear/editar/soft-delete producto), todas empezando con `requireAdminSession()`
- **Subida de imágenes directa y firmada al navegador** (no a través de un Server Action): un Server Action chico genera una firma temporal de Cloudinary (usando el API secret server-side, nunca expuesto al cliente) y el navegador sube el archivo directo a Cloudinary. Necesario porque Vercel tiene un límite de ~4.5MB por request — proxiar el archivo a través de un Server Action rompería con fotos de producto reales en buena resolución. Es el patrón que Cloudinary documenta para este caso, no un workaround.
- Soft delete **reutiliza la columna `active` que ya existe desde Sprint 1** (la misma que ya filtra el catálogo público y la validación de carrito) — no hace falta una columna nueva.
- **Listado admin con una query separada que NO filtra por `active`** (a diferencia del catálogo público): muestra también los productos inactivos, marcados visualmente, con una acción para reactivarlos. Sin esto, un producto "borrado" desaparecería también del panel admin, sin forma de deshacer el borrado sin tocar la base a mano — contradice el objetivo del sprint.
- Listado admin de productos con acceso rápido a edición (UI con shadcn/ui)
**Dependencias:** Depende de: Modelo de datos — Sprint 1; Protección de rutas admin (Historia 4.2)
**Casos borde:** Eliminar un producto que ya tiene órdenes asociadas → soft delete (marcar inactivo), nunca borrado físico — el historial de pedidos no se rompe porque `orderItems` ya guarda nombre/precio propios (Sprint 2), independientes de la fila viva del producto; subida de imagen que falla → mensaje de error sin perder los demás campos ya completados del formulario
**Criterio de aceptación:** Un cambio de precio o descripción hecho en el panel se refleja inmediatamente en el catálogo público.
**Estimación:** 9h / 8 SP

### Historia 4.4 — CRUD de categorías
**Historia:** Como administrador, quiero crear, editar y eliminar categorías, para reorganizar el catálogo cuando cambie la colección.
**Rol:** Frontend + Backend
**Tareas técnicas:**
- Server Actions de admin (crear/editar/borrar categoría), con `requireAdminSession()`
- UI de gestión de categorías en el panel (shadcn/ui)
**Dependencias:** Depende de: CRUD de productos (Historia 4.3)
**Casos borde:** Eliminar una categoría que tiene productos asociados → bloquear la eliminación (mensaje explícito, sin auto-reasignar). Solo cuentan los productos **activos** para este chequeo — un producto ya soft-deleted no debe bloquear la eliminación de una categoría, sería lógica muerta desde la perspectiva del admin.
**Criterio de aceptación:** Las categorías creadas/editadas desde el panel aparecen inmediatamente en el filtro del catálogo público.
**Estimación:** 4h / 3 SP

### Testing Sprint 4
**Tarea:** Tests de autenticación (login válido/inválido, expiración de sesión, acceso sin sesión, rate limit de intentos fallidos), tests de `requireAdminSession()` en Server Actions Y en el layout de páginas, y tests de CRUD de productos/categorías incluyendo el soft delete con órdenes asociadas y el bloqueo de categoría solo por productos activos, con Vitest.
**Rol:** Backend
**Criterio de aceptación:** Suite verde cubriendo accesos no autorizados (tanto Server Actions como páginas), la regla de soft delete, y el caso borde de categoría con productos inactivos.
**Estimación:** 6h / 3 SP

**Definición de Hecho del Sprint:**
- [ ] Login admin funcionando con protección real de rutas Y páginas (no solo Server Actions)
- [ ] CRUD de productos (con subida de imágenes directa a Cloudinary) y categorías operativo end-to-end desde el panel
- [ ] Ningún endpoint, página ni Server Action admin accesible sin sesión válida (verificado manualmente)
- [ ] Demo al cliente realizada

**Recortables si el sprint se atrasa:**
- No recortable: Login + protección de rutas y páginas (sin esto no hay panel seguro), CRUD de productos
- Recortable a Sprint 5: CRUD de categorías (el cliente puede seguir un sprint más con las categorías cargadas por seed/desarrollador)

**Demo al cliente:** Loguearse en el panel admin, editar el precio y la descripción de un producto en vivo, y verlo reflejado inmediatamente en la tienda pública.

> **Nota de revisión de arquitectura (`/plan-eng-review`):** revisado antes de implementarse. La revisión propia resolvió el bloqueante del DoR (admin único, sin roles) y encontró 4 decisiones de arquitectura (conexión separada para Better Auth, rate limit respaldado en DB, bootstrap del admin vía seed sin ruta de registro pública, y confirmar el patrón proxy.ts + doble chequeo de sesión ya usado). Una revisión cruzada independiente (outside voice) encontró **2 hallazgos críticos** que la revisión propia no vio: (1) `requireAdminSession()` solo cubría Server Actions, dejando las páginas admin (Server Components que leen la DB directo) protegidas únicamente por el chequeo liviano de cookie del proxy — el mismo problema de capa única que el sprint busca evitar; y (2) subir imágenes vía Server Action choca con el límite de ~4.5MB de Vercel, resuelto con subida directa firmada al navegador (el patrón que Cloudinary recomienda, no un workaround). También encontró que Better Auth y el driver `neon-http` del resto de la app son incompatibles (transacciones reales requeridas, bug conocido reportado contra Better Auth), resuelto con una conexión `neon-serverless` separada solo para las tablas de auth. El total subió de 22h/17 SP a 29h/23 SP por esto — principalmente Historia 4.1 (conexión separada + bootstrap) e Historia 4.3 (subida firmada + query admin separada).

**Total Sprint 4:** 29h / 23 SP

---

## Sprint 5 — Panel admin: gestión de pedidos, envíos y stock

**Objetivo:** Que el personal pueda operar el día a día de pedidos (ver, actualizar envío, corregir estado) y mantener el stock bajo control.

**Definición de Listo (DoR):**
- Definición de los estados de envío que maneja el cliente (ej. "preparando", "despachado", "entregado")
- Definición de si el control de stock es por producto simple o por variante (talle/color) — impacta el modelo si no se cerró en Sprint 1

### Historia 5.1 — Listado y detalle de pedidos en panel admin
**Historia:** Como administrador, quiero ver todos los pedidos con su estado y detalle, para gestionar la operación diaria de la tienda.
**Rol:** Frontend + Backend
**Tareas técnicas:**
- Route Handler `GET /api/admin/orders` con filtros por estado y fecha
- Vista de detalle de orden (productos, datos de envío, estado de pago, estado de envío)
**Dependencias:** Depende de: Modelo de Order — Sprint 2; Protección de rutas admin — Sprint 4
**Casos borde:** Pedido con pago rechazado que igual aparece en el listado → debe distinguirse visualmente de los pagados, para no confundir al personal de despacho
**Criterio de aceptación:** El administrador puede ver todos los pedidos y filtrarlos por estado sin necesidad de acceder a la base de datos.
**Estimación:** 5h / 5 SP

### Historia 5.2 — Actualización de estado de envío
**Historia:** Como administrador, quiero marcar un pedido como "despachado" o "entregado", para que el estado de envío esté siempre actualizado.
**Rol:** Frontend + Backend
**Tareas técnicas:**
- Route Handler `PATCH /api/admin/orders/:id/shipping-status`
- Selector de estado de envío en el detalle de pedido
- (Opcional según DoR) Campo de número de seguimiento manual
**Dependencias:** Depende de: Listado de pedidos (Historia 5.1)
**Casos borde:** Intentar marcar como "entregado" un pedido que no está pagado → bloquear la transición o pedir confirmación explícita
**Criterio de aceptación:** Cambiar el estado de envío desde el panel se refleja inmediatamente en el detalle del pedido.
**Estimación:** 4h / 3 SP

### Historia 5.3 — Actualización manual de estado de pedido
**Historia:** Como administrador, quiero poder corregir manualmente el estado de un pedido, para resolver casos excepcionales que el sistema automático no contempla.
**Rol:** Backend
**Tareas técnicas:**
- Route Handler `PATCH /api/admin/orders/:id/status` con override manual
- Registro de auditoría (quién cambió el estado y cuándo)
**Dependencias:** Depende de: Actualización automática de estado — Sprint 3
**Casos borde:** Cambio manual que contradice el estado real del pago en MercadoPago → permitir pero dejar registrado en el log de auditoría para evitar confusiones futuras
**Criterio de aceptación:** Un administrador puede forzar el cambio de estado de un pedido y queda registro de quién lo hizo.
**Estimación:** 3h / 2 SP

### Historia 5.4 — Control de stock
**Historia:** Como administrador, quiero ver y editar el stock disponible de cada producto, para evitar vender lo que no tengo.
**Rol:** Frontend + Backend
**Tareas técnicas:**
- Vista de stock en el panel con edición inline (shadcn/ui)
- Descuento automático de stock ya conectado desde Sprint 3 (verificar consistencia)
- Alerta visual de stock bajo/agotado en el panel
**Dependencias:** Depende de: Actualización automática de stock — Sprint 3; CRUD de productos — Sprint 4
**Casos borde:** Dos administradores editando el stock del mismo producto al mismo tiempo → última escritura gana (aceptable para este volumen), documentado como limitación conocida; stock llevado a negativo por edición manual → validar que no sea menor a 0
**Criterio de aceptación:** El stock mostrado en el panel siempre coincide con el disponible real, y un producto sin stock no puede comprarse en la tienda pública.
**Estimación:** 6h / 5 SP

### Testing Sprint 5
**Tarea:** Test de integración del flujo completo pedido pagado → cambio de estado de envío → verificación de que el stock descontado en Sprint 3 es consistente con lo mostrado en el panel, con Vitest.
**Rol:** Backend
**Criterio de aceptación:** El flujo completo pedido→envío→stock se valida sin inconsistencias entre lo que ve el admin y lo que hay en base de datos.
**Estimación:** 4h / 2 SP

**Definición de Hecho del Sprint:**
- [ ] Panel de pedidos operativo con filtros por estado
- [ ] Estado de envío y de pedido editables desde el panel
- [ ] Stock visible, editable y consistente con las ventas automáticas
- [ ] Demo al cliente realizada

**Recortables si el sprint se atrasa:**
- No recortable: Listado/detalle de pedidos, Control de stock
- Recortable a Sprint 6: Registro de auditoría de cambios manuales de estado (puede lanzarse sin el log, agregándolo después)

**Demo al cliente:** Recorrer un pedido real desde que se pagó hasta marcarlo como despachado, y mostrar cómo el stock se actualiza solo tras la venta.

**Total Sprint 5:** 22h / 17 SP

---

## Sprint 6 — Identidad visual + Testing general + Deploy

**Objetivo:** Dejar la tienda con la identidad visual definitiva del cliente, validada de punta a punta y publicada en producción.

**Definición de Listo (DoR):**
- Logo en formatos finales (SVG, favicon) — variantes ya usadas desde el Sprint 1
- Credenciales de producción de MercadoPago (Access Token real, no de test)
- Dominio propio del cliente disponible y con acceso a su configuración DNS

### Historia 6.1 — Ajuste final de identidad visual (QA de marca)
**Historia:** Como cliente, quiero una revisión final de que toda la tienda refleja mi identidad de marca de forma consistente, para asegurarme de que no quedó ningún resabio visual antes del lanzamiento.
**Rol:** Frontend / Diseño
**Tareas técnicas:**
- Auditoría de las pantallas construidas en Sprints 1-5 (la paleta y el logo ya se aplicaron desde el Setup del Sprint 1, no se reconstruyen acá)
- Revisión de contraste (accesibilidad) entre lila/negro/gris en textos y botones
- Ajustes puntuales de algún componente que haya quedado con color placeholder
**Dependencias:** Depende de: Tokens de marca configurados en Setup (Historia 1.1) y todo el frontend construido en Sprints 1-5
**Casos borde:** Contraste insuficiente en algún componente (ej. texto gris claro sobre fondo lila) → ajustar tono específico manteniendo la paleta aprobada
**Criterio de aceptación:** Todas las pantallas de la tienda y el panel admin usan la paleta y el logo definitivos, sin colores placeholder remanentes.
**Estimación:** 3h / 2 SP

### Historia 6.2 — Ajustes responsive y pulido de UI
**Historia:** Como visitante, quiero que la tienda se vea y funcione bien en mi celular, para poder comprar desde cualquier dispositivo.
**Rol:** Frontend
**Tareas técnicas:**
- Revisión responsive de catálogo, ficha de producto, carrito y checkout en mobile/tablet/desktop
- Ajustes de espaciados, tipografía y estados de hover/focus con la paleta final
**Dependencias:** Depende de: Aplicación de paleta (Historia 6.1)
**Casos borde:** Galería de imágenes de la ficha de producto en pantallas muy angostas → verificar que el lightbox no rompa el layout
**Criterio de aceptación:** El flujo completo de compra es usable sin errores visuales en un viewport mobile estándar (375px de ancho).
**Estimación:** 4h / 3 SP

### Historia 6.3 — Testing end-to-end de todo el sistema
**Historia:** Como equipo de desarrollo, quiero validar el sistema completo de punta a punta antes del deploy final, para asegurar que todas las piezas integradas funcionan juntas.
**Rol:** Backend / Frontend
**Tareas técnicas:**
- Suite E2E automatizada con Playwright cubriendo el flujo crítico: catálogo → ficha → carrito (mayorista y minorista) → checkout → pago → webhook → email → gestión en panel admin → cambio de stock
- Prueba manual final de un pago real en producción con monto bajo
- Revisión de logs de errores (Sentry) sin issues críticos abiertos
**Dependencias:** Depende de: Todos los sprints anteriores
**Casos borde:** Cualquier discrepancia entre comportamiento en sandbox (Sprint 3) y producción real de MercadoPago → ajustar antes del cierre
**Criterio de aceptación:** Se completa una compra real de bajo monto en producción de punta a punta sin errores, con el pedido reflejado correctamente en el panel admin.
**Estimación:** 5h / 5 SP

### Historia 6.4 — Deploy a producción
**Historia:** Como cliente, quiero que mi tienda esté publicada en mi dominio propio, para poder empezar a vender.
**Rol:** Backend / DevOps
**Tareas técnicas:**
- Deploy del proyecto Next.js completo (frontend + funciones serverless/edge) en Vercel apuntando al dominio del cliente
- Provisioning de la base de datos de producción en Neon con pooling de conexiones serverless-friendly
- Configuración de DNS y certificado SSL (gestionado por Vercel)
- Configuración de credenciales de producción (MercadoPago, Resend, Cloudinary, Better Auth)
**Dependencias:** Depende de: Testing end-to-end (Historia 6.3)
**Casos borde:** Corte de DNS/propagación demorada → comunicar tiempos esperados al cliente con anticipación, no dejarlo para el último día
**Criterio de aceptación:** La tienda es accesible públicamente en el dominio del cliente con HTTPS y procesando pagos reales.
**Estimación:** 4h / 3 SP

**Definición de Hecho del Sprint:**
- [ ] Paleta de colores y logo aplicados en toda la plataforma
- [ ] Responsive validado en mobile/tablet/desktop
- [ ] Compra real de prueba completada en producción sin errores
- [ ] Tienda publicada en el dominio del cliente con SSL
- [ ] Demo final al cliente realizada

**Recortables si el sprint se atrasa:**
- No recortable: Testing end-to-end, Deploy a producción
- Recortable (post-lanzamiento, no bloquea el go-live): pulido fino de responsive en breakpoints intermedios (tablet), puede iterarse la primera semana post-lanzamiento

**Demo al cliente:** Tienda completa funcionando en su propio dominio, con su marca aplicada, procesando una compra real de punta a punta.

**Total Sprint 6:** 16h / 13 SP

---

## A) Requisitos no funcionales

**Seguridad:**
- Todas las rutas `/api/admin/*` protegidas por sesión de Better Auth + verificación de rol (Sprint 4)
- Sesiones de administrador gestionadas por Better Auth (cookies httpOnly, rotación de sesión), sin manejo manual de contraseñas en texto plano
- Validación y sanitización de todo input de usuario con Zod (checkout, formularios admin) para prevenir inyección
- Uso de Drizzle ORM (queries parametrizadas) para prevenir SQL injection
- HTTPS obligatorio en producción (gestionado por Vercel)
- Rate limiting en endpoints de login y checkout para mitigar fuerza bruta y abuso
- Verificación de pagos siempre contra la API de MercadoPago, nunca confiando en el payload crudo del webhook

**Rendimiento esperado:**
- Tiempo de carga del catálogo (primera carga) por debajo de 2.5s en conexión 4G
- Paginación server-side en listados (nunca traer el catálogo completo al cliente)
- Imágenes servidas y optimizadas vía Cloudinary (formatos responsive, lazy loading)
- Índices de base de datos en columnas de búsqueda/filtro frecuente (nombre de producto, categoría, estado de orden)
- Rutas de catálogo candidatas a Edge Runtime de Vercel para reducir latencia en usuarios lejos de la región principal

**Manejo de errores:**
- Logging centralizado, integrado a Sentry para alertas de errores en producción
- Páginas de error genéricas (404, 500) sin exponer detalles técnicos al usuario final
- Webhooks de MercadoPago procesados de forma idempotente y con reintento controlado ante fallos
- Job periódico de reconciliación de pagos pendientes como respaldo ante webhooks perdidos

---

## B) Fuera de alcance

- Aplicación mobile nativa (iOS/Android)
- Soporte multi-idioma y multi-moneda
- Facturación electrónica (AFIP u otro organismo fiscal)
- Integración automática con transportistas (Correo Argentino, OCA, Andreani) para cotización o generación de etiquetas de envío — el estado de envío se gestiona manualmente desde el panel
- Sistema de reviews/calificaciones de productos
- Cupones de descuento, programas de fidelización o promociones automáticas
- Chat en vivo o soporte integrado
- Multi-tienda o funcionalidad de marketplace (múltiples vendedores)
- Funcionalidad offline / PWA instalable
- Analítica avanzada más allá de lo que provea Google Analytics básico (si se integra, es un alcance aparte)
- Gestión de variantes complejas de producto (talle x color como combinaciones independientes de stock) si no fue definido explícitamente en el DoR del Sprint 1/5

---

## C) Checklist de entrega al cliente

**Accesos que se entregan:**
- [ ] Usuario y contraseña de acceso al panel de administración
- [ ] Acceso al repositorio de código (GitHub)
- [ ] Acceso al proyecto de hosting (Vercel) y a la base de datos (Neon)
- [ ] Acceso a la cuenta de Cloudinary (si se crea a nombre del cliente)
- [ ] Acceso a la cuenta de Resend (email transaccional)

**Documentación entregada:**
- [ ] README técnico del proyecto (cómo levantar el entorno, variables de entorno)
- [ ] Guía breve de uso del panel admin (cómo editar productos, gestionar pedidos y stock)
- [ ] Documento con las credenciales entregadas y dónde están alojadas

**Pendiente de configurar del lado del cliente:**
- [ ] Cuenta de MercadoPago propia verificada en modo producción (credenciales reales)
- [ ] Dominio propio apuntado (DNS) al hosting del proyecto
- [ ] Definición de política de envíos y costos (no automatizada, se gestiona manualmente)
- [ ] Alta impositiva/facturación si decide incorporarla a futuro (fuera de este alcance)

---

## D) Tabla resumen

| Sprint | Objetivo | Horas | Story Points | Fecha estimada de entrega |
|---|---|---|---|---|
| 1 | Setup + Catálogo + Ficha de producto + spike MercadoPago | 34h | 24 SP | 10/07/2026 |
| 2 | Precios mayorista/minorista + Carrito + Checkout sin registro | 29h | 24 SP | 17/07/2026 |
| 3 | MercadoPago + Webhooks + Notificaciones | 37h | 35 SP | 24/07/2026 |
| 4 | Panel admin: login + CRUD productos | 29h | 23 SP | 31/07/2026 |
| 5 | Panel admin: pedidos, envíos y stock | 22h | 17 SP | 07/08/2026 |
| 6 | Ajuste final de marca + Testing general + Deploy | 16h | 13 SP | 14/08/2026 |
| **Total** | | **167h** | **136 SP** | **14/08/2026** |

> Sprint 2 subió respecto de la estimación original (24h→29h) tras su propia revisión de arquitectura (`/plan-eng-review`). Sprint 3 subió más de lo habitual (28h→37h, +9h) tras su revisión: la mitad de ese incremento vino de dos bugs reales que encontró una revisión cruzada independiente (outside voice) en las propias decisiones de la revisión — liberación de stock no protegida contra doble-ejecución, y un estado intermedio (`en_proceso`) tratado como final cuando no lo es — y la otra mitad de una restricción de plataforma no contemplada (Vercel Hobby no soporta cron frecuente) y un vacío de negocio (métodos de pago offline de MercadoPago). Sprint 4 subió de 22h/17 SP a 29h/23 SP (+7h) por su propia revisión: la voz independiente encontró que el chequeo de sesión solo cubría Server Actions (dejando páginas admin protegidas únicamente por el proxy liviano) y que subir imágenes vía Server Action choca con el límite de ~4.5MB de Vercel, además de una incompatibilidad real entre Better Auth y el driver `neon-http` del resto de la app. Ver las notas dentro de cada sprint para el detalle. La fecha de entrega final no se mueve por ahora (asume que cada semana absorbe su propio trabajo extra); si en la práctica no alcanza, son las primeras candidatas a mover.
