# Sprint actual: Persistent Category Dropdown in Header

**SCOPE: DESKTOP ONLY** — 1280px+ resolution. Mobile nav not addressed in this sprint.

---

## Implementation tasks

- [x] **Create dropdown-menu.tsx primitive** - DoD: `src/components/ui/dropdown-menu.tsx` exports DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator; built from `"radix-ui"` DropdownMenu with `data-slot` attributes and animation classes (fade-in-0 zoom-in-95 slide-in-from-top-2 on open, fade-out-0 zoom-out-95 on close, duration-150); uses `--popover`/`--popover-foreground` tokens for content, `--accent`/`--accent-foreground` for hover/focus states; `rounded-lg` panel, `rounded-md` items; `max-h-80 overflow-y-auto` for scrollable lists.

- [x] **Create category-nav.tsx feature component** - DoD: `src/components/category-nav.tsx` is `"use client"` component accepting `{ categories: { id: string; name: string; slug: string }[] }`; renders nothing if `categories.length === 0`; DropdownMenuTrigger is a plain `<button>` with `text-sm font-medium text-foreground hover:text-primary` (matches CartLink typography), contains "Categorías" text and ChevronDown icon (`size-4`) with `[&[data-state=open]_svg]:rotate-180 transition-transform` animation; menu content includes "Todas" link to "/" then separator, then category items using `buildCatalogHref({ categoryId })` from `src/lib/catalog-url.ts`; no local state (Radix owns open/close).

- [x] **Make RootLayout async and fetch categories** - DoD: `src/app/layout.tsx` becomes `async` function; calls `getCategories()` from `src/db/queries/categories.ts`; passes result as `categories` prop to `<CategoryNav categories={categories} />`; optionally wraps `getCategories` in React's `cache()` to dedupe DB calls across layout + page in single request (nice-to-have, not required).

- [x] **Restructure header markup to 3-zone layout** - DoD: Header's current `justify-between` flex row splits into: (left) `flex items-center gap-6` wrapper containing Logo and CategoryNav, (right) CartLink; no changes to header's `z-index` or root layout structure; menu portals to document.body with `z-50` so no stacking-context work needed.

- [x] **Visual verification at desktop resolution** - DoD: Test at 1280px+ width; verify dropdown opens/closes on click; chevron rotates on state change; menu items navigate via Link and close menu on selection; closes on Escape key and outside click; Radix positioning with `align="start"` and `sideOffset={8}` looks correct; menu scrolls at max-h-80 if category list is long; active-category highlighting explicitly not implemented (out of scope per spec); all text contrast and focus rings pass WCAG AA per existing token definitions.
  - **Verificado con Playwright/Chromium real** (la nota anterior de "Chromium no instalado" estaba desactualizada — ya se instaló y se usa en este proyecto desde antes, ver `e2e/`): a 1280×800 el menú abre con click mostrando "Todas" + separador + las 7 categorías, el chevron rota, `Escape` cierra el menú y devuelve el foco al trigger, y clickear una categoría (ej. "Remeras") navega a `/?categoryId=...` y cierra el menú. `npx tsc --noEmit`, `npm run lint`, `npm run build` y `npm test` (130 tests) pasan limpio.
