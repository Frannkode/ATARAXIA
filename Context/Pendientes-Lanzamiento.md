# Lo que necesito de vos para terminar y publicar la tienda

Completá cada campo abajo (reemplazando el `___`) y avisame cuando esté. Es lo único que falta — todo lo demás del backlog (6 sprints) ya está construido, testeado y commiteado.

---

## 🔴 Bloqueantes — sin esto no se puede publicar en tu dominio real

### 1. Logo final
- Archivo SVG (vectorial): ___
- Variantes PNG (para favicon, redes, etc.): ___

*Hoy el sitio usa un favicon placeholder (fondo lila, letra "A") porque nunca llegó el logo real.*

### 2. MercadoPago — credenciales de producción
- Access Token de producción (`APP_USR-...`, el real, no el de test): ___
- Public Key de producción: ___

*Hoy el sitio funciona con las credenciales de test que ya me pasaste — sirven para seguir probando, pero no cobran plata real.*

### 3. Dominio propio
- Dominio ya comprado: ___
- ¿Quién tiene acceso para cambiar la configuración DNS (vos, tu hosting actual, alguien más)?: ___
- ¿El panel admin va en `tudominio.com/admin` o preferís un subdominio tipo `admin.tudominio.com`?: ___ *(si no contestás, se deja `/admin`, que es lo recomendado y ya está armado así)*

---

## 🟡 Recomendado — no bloquea la publicación, pero conviene antes de lanzar

### 4. Sentry (monitoreo de errores)
Ya dejé el código integrado, solo falta la cuenta:
- Creá una cuenta gratis en https://sentry.io (o decime si ya tenés una del estudio/empresa)
- Creá un proyecto tipo "Next.js" y pasame:
  - DSN: ___
  - Org (slug): ___
  - Project (slug): ___
  - Auth Token (solo si querés que suba los sourcemaps para ver errores con el código real, no obligatorio): ___

### 5. Política de cambios/devoluciones
¿Querés una página estática con el texto de tu política de cambios/devoluciones?
- Sí / No: ___
- Si sí, pegá el texto acá: ___

---

## 🟢 Opcional — solo si te interesa, no urgente

- ¿Querés que cada pedido genere un comprobante simple (PDF o resumen) para el cliente? (no es factura electrónica, eso sigue fuera de alcance): ___
- ¿Ya tenés cuenta de Google Analytics / Search Console, o hace falta crearlas?: ___
- ¿Te interesa notificar pedidos por WhatsApp además de email? (hoy no está incluido, si te interesa lo cotizamos aparte): ___

---

**Una vez que completes esto:**
1. Bloqueantes (1-3) → hago el deploy real a tu dominio y probamos un pago real de bajo monto.
2. Sentry (4) → lo activo con tu DSN, dos líneas de config.
3. Resto → lo sumamos cuando quieras, no frena nada de lo anterior.
