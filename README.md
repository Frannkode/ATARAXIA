# Tienda — E-commerce de indumentaria

Proyecto full-stack en Next.js (App Router). Ver `Context/Backlog-Ecommerce.md` para el backlog completo y `Context/Preguntas-Cliente.md` para las decisiones de negocio pendientes de confirmar.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- PostgreSQL serverless (Neon) + Drizzle ORM
- Cloudinary (imágenes de producto)
- MercadoPago SDK (Sprint 3), Resend (Sprint 3), Better Auth (Sprint 4)

## Requisitos

- Node.js 20+
- Una base de datos PostgreSQL en [Neon](https://neon.tech)

## Setup local

1. Instalar dependencias:

   ```bash
   npm install
   ```

2. Copiar `.env.example` a `.env` y completar las variables (al menos `DATABASE_URL` para tener catálogo real; el resto se usa recién en sprints posteriores):

   ```bash
   cp .env.example .env
   ```

3. Levantar el servidor de desarrollo:

   ```bash
   npm run dev
   ```

4. Verificar que responde en [http://localhost:3000](http://localhost:3000) y que `/api/health` devuelve `{ "status": "ok" }`. Si `DATABASE_URL` todavía no está configurado, `database` aparece como `"not_configured"` — es esperado hasta que se resuelva la pregunta pendiente sobre la cuenta de Neon.

## Base de datos (Drizzle)

- `npm run db:generate` — genera migraciones a partir de `src/db/schema.ts`
- `npm run db:migrate` — aplica las migraciones pendientes contra `DATABASE_URL`
- `npm run db:studio` — abre Drizzle Studio para explorar los datos

El schema todavía es un stub (`src/db/schema.ts`) — se completa en la Historia 1.2 (Modelo de datos base).

## Calidad de código

- `npm run lint` — ESLint (flat config, extiende `next/core-web-vitals` + Prettier)
- `npm run format` — Prettier

## Estructura

```
src/
  app/            # rutas (App Router) y Route Handlers (/api/*)
  db/             # conexión Drizzle + schema
  lib/            # utilidades (cn, Cloudinary, etc.)
  components/ui/  # componentes shadcn/ui
```

## Paleta de marca

Los tokens de color viven en `src/app/globals.css` (`@theme`). Los valores HEX actuales son **placeholder** hasta que el cliente confirme los definitivos (lila/negro/gris) — ver la pregunta bloqueante en `Context/Preguntas-Cliente.md`. Una vez confirmados, solo hay que actualizar `--color-brand-lila`, `--color-brand-lila-dark`, `--color-brand-black` y `--color-brand-gray*` en ese archivo.
