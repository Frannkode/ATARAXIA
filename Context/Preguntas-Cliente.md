# Preguntas pendientes al cliente — E-commerce de Indumentaria

Esto es lo que necesito confirmado para no frenar el desarrollo a mitad de sprint. Está ordenado por cuándo hace falta la respuesta, no por importancia — todo lo marcado **🔴 Bloqueante** frena directamente el inicio del sprint indicado si no está resuelto a tiempo.

---

## Antes de arrancar (Sprint 1)

- 🔴 **Logo** en formato vectorial (SVG o AI) + variantes en PNG.
- 🔴 **Paleta de marca**: códigos HEX exactos de lila, negro y gris (no "un lila más o menos así" — la aplicamos desde el día 1, así que necesito los valores finales, no una referencia aproximada).
- 🔴 **Al menos 10 productos reales** con mínimo 3 fotos cada uno y descripciones, para no lanzar el catálogo con datos de prueba.
- **Categorías iniciales**: nombres y si hay jerarquía (ej. "Ropa > Remeras > Manga corta" o todo plano).
- **Campos de producto**: además de nombre/precio/descripción, ¿manejan talle, color, u otro atributo como campo estructurado? Esto define si el modelo de datos necesita variantes (talle x color con stock independiente) o si por ahora alcanza con talles como texto libre en la descripción.
- Acceso a un **repositorio de GitHub** (o autorización para crear uno).
- Cuenta de **Cloudinary** (o autorización para crear una a su nombre).
- 🔴 **Acceso a una cuenta de MercadoPago** del cliente, aunque sea en modo test — la necesito desde el Sprint 1 para el spike de validación, no recién en el Sprint 3.

## Antes del Sprint 2 (precios y checkout)

- 🔴 **Regla de mayorista**: ¿cuál es la cantidad mínima para que aplique precio mayorista? ¿Es la misma para todos los productos o varía por producto? ¿Se calcula por producto individual o por el total del pedido (ej. "6 prendas en total, mezclando productos")?
- **Datos de envío**: ¿qué campos son obligatorios en el checkout? (dirección, localidad, código postal, teléfono, DNI/CUIT, aclaración de piso/depto)
- **Retiro en el local**: ¿es una opción de entrega? Si sí, dirección y horarios para mostrar en el checkout.
- **Costo de envío**: ¿fijo, variable por zona, a coordinar por WhatsApp después de la compra, o gratis? Esto define si el checkout necesita un campo de costo de envío o si ese monto queda fuera del pago inicial.
- **Moneda y precios**: confirmar que todo es en pesos argentinos (ARS) y si los precios que cargan ya incluyen IVA o se muestran discriminados.
- **Monto mínimo de compra**, si existe.

## Antes del Sprint 3 (MercadoPago y notificaciones)

- 🔴 **Cuenta de MercadoPago verificada** con Access Token y Public Key (al menos de test; la de producción se necesita recién para el Sprint 6).
- **Pago rechazado**: ¿el cliente recibe la opción de reintentar el pago sobre el mismo pedido, o tiene que volver a armar el carrito?
- **Textos de los emails transaccionales**: al menos un borrador de qué dice el email de "pago aprobado" y el de "pago rechazado" (tono, firma, datos de contacto).
- ¿Hay redes sociales o WhatsApp de contacto para incluir en el email y en el footer del sitio?

## Antes del Sprint 4 (panel admin)

- 🔴 **Lista de administradores iniciales** (email de cada uno) y si hay más de un nivel de permiso (ej. "puede editar precios" vs "solo puede ver pedidos").
- ¿El panel admin va en una ruta del mismo dominio (`tudominio.com/admin`) o en un subdominio (`admin.tudominio.com`)? Esto no cambia el desarrollo pero sí la configuración de DNS más adelante.

## Antes del Sprint 5 (pedidos, envíos, stock)

- **Estados de envío** que van a usar en el día a día (ej. "preparando", "despachado", "entregado" — ¿son estos o manejan otros nombres/pasos?).
- Ya preguntado en Sprint 1, pero confirmar de nuevo acá porque afecta directamente el control de stock: ¿el stock se maneja por producto simple o por variante (talle/color con cantidades independientes)?

## Antes del Sprint 6 (identidad final y lanzamiento)

- 🔴 **Credenciales de producción de MercadoPago** (Access Token real, no de test).
- 🔴 **Dominio propio** ya comprado, con acceso a su configuración DNS (o alguien que pueda hacer los cambios cuando se lo pidamos).
- Confirmar si quieren una **página de política de cambios/devoluciones** como texto estático en el sitio (no es una funcionalidad, es solo contenido — pero si la quieren, necesito el texto).

## Preguntas generales (no bloquean un sprint puntual, pero conviene resolver pronto)

- ¿Necesitan que el pedido genere algún tipo de comprobante simple para el cliente (no es factura electrónica, eso está fuera de alcance — hablo de un PDF o resumen básico del pedido)?
- ¿Tienen ya cuenta de Google Analytics / Search Console, o hay que crearlas?
- ¿Quieren notificar pedidos también por WhatsApp además de email? (Hoy está fuera de alcance, pero si es una prioridad real conviene saberlo ahora para cotizarlo aparte, no meterlo de apuro).

---

**Cómo usar esto:** a medida que tengan una respuesta, la tachamos o la completamos acá mismo y avisen para actualizar el backlog si algo cambia el alcance (por ejemplo, si confirman que necesitan variantes de talle/color con stock independiente, eso agrega horas al Sprint 1 y al Sprint 5 que hoy no están contempladas).
