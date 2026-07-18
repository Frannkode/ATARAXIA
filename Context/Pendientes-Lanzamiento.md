# Lo que necesito de vos para terminar y publicar la tienda

Completá cada campo abajo (reemplazando el `___`) y avisame cuando esté. Es lo único que falta — todo lo demás del backlog (6 sprints) ya está construido, testeado y commiteado.

✅ **Ya publicado y funcionando:** https://tienda-ecommerce-ataraxia.vercel.app (subdominio temporal de Vercel, con MercadoPago de test — no cobra plata real todavía). Corrí la suite de pruebas automatizadas contra esta URL real y pasó completa: catálogo, carrito, checkout, creación de preferencia de pago, login admin, cambio de estado de pedido y ajuste de stock.

---

## 🔴 Bloqueantes — sin esto no se puede publicar en tu dominio real

### 1. Logo final
- Archivo SVG (vectorial): ⚠️ **No puedo usar el archivo que dejaste** (`Nike,_Inc.-Logo.wine.svg`) — es el logo de Nike, una marca registrada de otra empresa, bajada de un sitio de recopilación de logos. Usarlo en tu tienda sería un problema legal real (uso no autorizado de marca ajena), no solo un detalle estético. Sigue pendiente: necesito el logo real de tu marca.
- Variantes PNG (para favicon, redes, etc.): ___

*Mientras tanto el sitio sigue con el favicon placeholder (fondo lila, letra "A").*

### 2. MercadoPago — credenciales de producción
- Access Token de producción (`APP_USR-...`, el real, no el de test): ___
- Public Key de producción: ___

> Contestando tu pregunta: sí, seguís con las credenciales de **test** hasta que tengas tu propia cuenta de MercadoPago verificada como titular del negocio (no hace falta un "cliente" tuyo — es tu cuenta de vendedor). Con test podés seguir probando todo el flujo sin límite de tiempo, simplemente no cobra plata real. Cuando abras/verifiques tu cuenta de MercadoPago, pasame el Access Token y Public Key de producción y cambiamos solo esas dos variables.

### 3. Dominio propio
- Dominio ya comprado: ___ → **No tenés, anotado.**
- ¿Quién tiene acceso para cambiar la configuración DNS?: ___
- ¿Panel admin en `/admin` o subdominio?: ___ *(sin dominio propio esto no aplica todavía)*

> Como no tenés dominio, la alternativa que propongo es publicar igual en un subdominio gratuito de Vercel (`algo.vercel.app`) como URL "real" temporal — así ya queda accesible públicamente y probamos el flujo completo, y el día que compres un dominio lo apuntamos sin tener que tocar nada del código. Te dejo esto como pregunta aparte para que me confirmes cómo seguir.

---

## 🟡 Recomendado — no bloquea la publicación, pero conviene antes de lanzar

### 4. Sentry (monitoreo de errores)
✅ **Listo** — DSN cargado en `.env`. El monitoreo de errores ya está activo.
- Org / Project / Auth Token: no los pasaste — sin ellos el build simplemente no sube los sourcemaps (vas a ver los errores en Sentry igual, solo que con el código minificado en vez del código fuente legible). Si en algún momento querés eso más prolijo, avisame y los agregamos.

### 5. Política de cambios/devoluciones
✅ Redacté un texto genérico (Ley de Defensa del Consumidor, derecho de arrepentimiento de 10 días para venta a distancia) y lo publiqué en `/politica-de-cambios`. **Ojo: es un texto estándar, no asesoramiento legal** — antes de que lo vea un cliente real, dale una leída y ajustá los plazos/condiciones a como realmente operás (¿el envío de la devolución lo pagás vos o el comprador? ¿aceptás cambios de talle sin devolución de dinero? etc.). Si querés, lo revisamos juntos.

---

## 🟢 Opcional — solo si te interesa, no urgente

- ¿Querés que cada pedido genere un comprobante simple (PDF o resumen) para el cliente? (no es factura electrónica, eso sigue fuera de alcance): ___
- ¿Ya tenés cuenta de Google Analytics / Search Console, o hace falta crearlas?: ___
- ¿Te interesa notificar pedidos por WhatsApp además de email? (hoy no está incluido, si te interesa lo cotizamos aparte): ___

### 6. Cron externo para expirar pedidos abandonados
✅ **Resuelto (2026-07-18)** — con la API key que dejaste (ya la saqué de este archivo, quedó solo en `.env`, nunca en un documento del repo) creé el cronjob directo por la API de cron-job.org:
- Job `ATARAXIA - expirar pedidos abandonados` (id `8118220`), activo.
- Le pega a `/api/cron/expire-orders` cada 15 minutos (min 0/15/30/45, todas las horas), zona horaria Argentina.
- Ya probé el endpoint a mano contra producción antes de esto y reconcilió correctamente pedidos viejos de prueba — el cronjob solo automatiza esa misma llamada.
- Podés ver el historial de ejecuciones entrando a tu cuenta de cron-job.org.

---

**Una vez que completes esto:**
1. Logo real + confirmación sobre el dominio (subdominio de Vercel o esperar) → avanzo con el deploy.
2. Credenciales de producción de MercadoPago → las cargamos y hacemos la prueba de pago real de bajo monto.
3. Resto → lo sumamos cuando quieras, no frena nada de lo anterior.
