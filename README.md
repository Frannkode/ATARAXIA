# KODE — E-commerce de indumentaria

Proyecto full-stack en Next.js (App Router). Ver `Context/Backlog-Ecommerce.md` para el backlog completo y `Context/Pendientes-Lanzamiento.md` para lo que falta confirmar antes del lanzamiento final (dominio propio, credenciales de producción de MercadoPago, logo real).

**Producción (subdominio temporal, hasta tener dominio propio):** https://kodeind.vercel.app

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- PostgreSQL serverless (Neon) + Drizzle ORM
- Cloudinary (imágenes de producto)
- MercadoPago SDK (pagos), Resend (emails transaccionales), Better Auth (panel admin)
- Sentry (monitoreo de errores)
- Vitest (unit + integration), Playwright (E2E)

## Requisitos

- Node.js 20+
- Una base de datos PostgreSQL en [Neon](https://neon.tech)
- Docker (solo para correr los integration tests localmente)

## Setup local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env` y completar las variables (ver el archivo para el detalle de cada una — cuáles son obligatorias depende de qué parte del flujo quieras probar):

   ```bash
   cp .env.example .env
   ```

3. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Verificar que responde en [http://localhost:3000](http://localhost:3000) y que `/api/health` devuelve `{ "status": "ok", "database": "connected" }`.

## Base de datos (Drizzle)

- `npm run db:generate` — genera migraciones a partir de `src/db/schema.ts`
- `npm run db:migrate` — aplica las migraciones pendientes contra `DATABASE_URL`
- `npm run db:studio` — abre Drizzle Studio para explorar los datos
- `npm run db:seed` — carga productos/categorías de muestra
- `npm run db:seed-admin` — crea la cuenta admin inicial (usa `ADMIN_EMAIL`/`ADMIN_PASSWORD` del `.env`)

## Testing

- `npm test` — unit tests (Vitest). Los archivos `*.integration.test.ts` necesitan `TEST_DATABASE_URL` apuntando a un Postgres real; sin esa variable se saltean solos.
- Para correr los integration tests localmente: levantar un Postgres 16 en Docker (puerto 5433 para no chocar con otros proyectos), aplicar todas las migraciones de `drizzle/*.sql` en orden, y correr `npm test` con `TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/<db>"`.
- `npm run test:e2e` — suite E2E con Playwright (`e2e/`), contra un dev server local en `localhost:3000` por default. Para correrla contra un deploy real en vez de local: `E2E_BASE_URL="https://kodeind.vercel.app" npm run test:e2e`.

## Deploy (Vercel)

El proyecto está linkeado a Vercel (`frannkodes-projects/kode`), conectado al repo de GitHub. Las variables de entorno de producción se cargan con `vercel env add <NOMBRE> production` (ver `.env.example` para la lista completa). Deploy manual: `npx vercel deploy --prod`.

Pendiente para el dominio propio del cliente: ver `Context/Pendientes-Lanzamiento.md`.

## Calidad de código

- `npm run lint` — ESLint (flat config, extiende `next/core-web-vitals` + Prettier)
- `npm run format` — Prettier

## Estructura

```
src/
  app/            # rutas (App Router) y Route Handlers (/api/*)
  actions/        # Server Actions
  db/             # conexión Drizzle + schema + queries
  lib/            # utilidades (pricing, auth, emails, Cloudinary, MercadoPago, etc.)
  components/     # componentes de UI (ui/ = shadcn/ui)
e2e/              # suite E2E (Playwright)
```

## Paleta de marca y logo

Los tokens de color viven en `src/app/globals.css` (`@theme`) — validados por contraste WCAG AA (Historia 6.1). El logo (wordmark vectorial "KODE", `public/kode-wordmark.svg` + `src/components/logo.tsx`) y el nombre de marca se actualizaron el 2026-07-18 (rebrand de "ATARAXIA" a "KODE"). El favicon (`src/app/icon.svg`) es un monograma "K" simple — el wordmark es horizontal y no entra bien en un ícono cuadrado chico.

## Monitoreo de errores (Sentry)

Integrado vía `@sentry/nextjs` (`src/instrumentation.ts`, `src/instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`). Sin `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` configurados, el SDK queda instalado pero inactivo — no rompe nada.

## SEO

- `src/app/robots.ts` y `src/app/sitemap.ts` (convención de archivos de Next.js) — el sitemap incluye catálogo, categorías y cada producto activo.
- Open Graph/Twitter card por default en `layout.tsx`, y por producto vía `generateMetadata` en `productos/[id]/page.tsx` (título, descripción, foto real del producto).
- Datos estructurados JSON-LD (`schema.org/Product`, con precio y disponibilidad) en cada ficha de producto, para rich snippets de Google.
