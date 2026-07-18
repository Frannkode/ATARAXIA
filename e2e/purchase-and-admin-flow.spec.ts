import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

// Historia 6.3 — flujo completo de punta a punta contra un dev server real
// (Neon + MercadoPago sandbox reales, ver .env). El webhook de MercadoPago
// es una llamada servidor-a-servidor que un browser no puede disparar, así
// que el paso "pago -> pasa a pagado" se ejercita acá vía el override manual
// del panel admin (src/lib/order-status-override.ts) — usa el MISMO
// mecanismo atómico (CTE de transición + ajuste de stock) que el webhook
// real (src/lib/payment-result.ts), ya cubierto por integration tests contra
// Postgres real. Lo que este archivo cubre es lo que esos tests no pueden:
// el camino que un usuario/admin realmente recorre en el navegador.

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

test.describe.serial("Flujo completo: catálogo -> checkout -> gestión admin", () => {
  const runId = randomUUID().slice(0, 8);
  const customerName = `E2E Test ${runId}`;
  const customerEmail = `e2e-${runId}@example.com`;
  let productName = "";

  test("catálogo -> ficha -> carrito -> checkout (minorista)", async ({ page }) => {
    await page.goto("/");

    const productLinks = page.locator('a[href^="/productos/"]');
    const count = await productLinks.count();
    test.skip(count === 0, "El catálogo no tiene productos cargados todavía.");
    if (count === 0) return;

    const hrefs: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await productLinks.nth(i).getAttribute("href");
      if (href) hrefs.push(href);
    }

    // El primer producto del catálogo puede estar sin stock — buscamos el
    // primero que sí tenga, en vez de asumir que el primero sirve.
    let inStockHref: string | null = null;
    for (const href of hrefs) {
      await page.goto(href);
      const addButtonVisible = await page
        .getByRole("button", { name: "Agregar al carrito" })
        .isVisible()
        .catch(() => false);
      if (addButtonVisible) {
        inStockHref = href;
        break;
      }
    }

    test.skip(!inStockHref, "Ningún producto del catálogo tiene stock disponible.");
    if (!inStockHref) return;

    productName = (await page.locator("h1").textContent())?.trim() ?? "";
    expect(productName.length).toBeGreaterThan(0);

    await page.getByRole("button", { name: "Agregar al carrito" }).click();
    await expect(page.getByRole("button", { name: "¡Agregado!" })).toBeVisible();

    await page.goto("/carrito");
    await expect(page.getByText(productName)).toBeVisible();
    await page.getByRole("link", { name: "Ir a pagar" }).click();
    await expect(page).toHaveURL(/\/checkout/);

    await page.locator("#name").fill(customerName);
    await page.locator("#email").fill(customerEmail);
    await page.locator("#phone").fill("+54 9 11 5555-5555");
    await page.locator("#address").fill("Calle Falsa 123, CABA");
    await page.getByRole("button", { name: "Confirmar pedido" }).click();

    // El pedido puede terminar en el checkout real de MercadoPago (si la
    // preferencia de pago se creó bien) o en /pedidos/[id] de nuestro propio
    // dominio (si falló la generación del link) — ambos casos significan
    // que el pedido se creó y el stock quedó reservado.
    await page.waitForURL(
      (url) => url.hostname.includes("mercadopago") || url.pathname.startsWith("/pedidos/"),
      { timeout: 20_000 },
    );

    if (page.url().includes("mercadopago")) {
      console.log("Redirigido al checkout real de MercadoPago (sandbox):", page.url());
    } else {
      await expect(page.getByText("¡Pedido recibido!")).toBeVisible();
    }
  });

  test("carrito mayorista: cantidad alta muestra precio mayorista distinto", async ({ page }) => {
    await page.goto("/");
    const productLinks = page.locator('a[href^="/productos/"]');
    const count = await productLinks.count();
    test.skip(count === 0, "El catálogo no tiene productos cargados todavía.");

    const hrefs: string[] = [];
    for (let i = 0; i < count; i++) {
      const href = await productLinks.nth(i).getAttribute("href");
      if (href) hrefs.push(href);
    }

    let wholesaleHref: string | null = null;
    let minQty = 0;
    for (const href of hrefs) {
      await page.goto(href);
      const hint = page.getByText(/A partir de \d+ unidades, precio mayorista/);
      if (await hint.isVisible().catch(() => false)) {
        const text = await hint.textContent();
        minQty = Number(text?.match(/\d+/)?.[0] ?? "0");
        wholesaleHref = href;
        break;
      }
    }

    test.skip(!wholesaleHref, "Ningún producto del catálogo tiene precio mayorista configurado.");
    if (!wholesaleHref || minQty === 0) return;

    const priceLine = page.locator("text=/c\\/u/").first();
    const retailText = (await priceLine.textContent()) ?? "";

    await page.locator("#quantity").fill(String(minQty));
    await expect(page.getByText("(mayorista)")).toBeVisible();
    const wholesaleText = (await priceLine.textContent()) ?? "";

    expect(wholesaleText).not.toEqual(retailText);
  });

  test("admin: login, fuerza el pedido a pagado y ajusta stock", async ({ page }) => {
    test.skip(
      !ADMIN_EMAIL || !ADMIN_PASSWORD,
      "Definí ADMIN_EMAIL/ADMIN_PASSWORD en .env para correr el flujo admin.",
    );
    test.skip(
      !productName,
      "El test de checkout no llegó a crear un pedido (se saltó o falló antes).",
    );
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !productName) return;

    await page.goto("/admin/login");
    await page.locator("#email").fill(ADMIN_EMAIL);
    await page.locator("#password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/admin(?!\/login)/, { timeout: 15_000 });

    await page.goto("/admin/orders");
    const orderRow = page.getByText(customerName);
    await expect(orderRow).toBeVisible({ timeout: 15_000 });
    await orderRow.click();
    await expect(page).toHaveURL(/\/admin\/orders\//);

    await page.locator("select").first().selectOption("pagado");
    await page.getByRole("button", { name: "Forzar estado" }).click();
    await expect(page.getByText('Estado forzado a "Pagado".')).toBeVisible({ timeout: 10_000 });

    await page.goto("/admin/stock");
    // Selector de clase (no sólo hasText): el texto del producto aparece en
    // varios divs anidados (el contenedor de toda la lista, la fila, el div
    // de nombre+sku) — .justify-between es la clase única de la fila
    // puntual que también incluye el StockAdjuster.
    const stockRow = page.locator("div.justify-between", { hasText: productName });
    await stockRow.getByPlaceholder("+10 / -3").fill("1");
    await stockRow.getByRole("button", { name: "Ajustar" }).click();
    await expect(page.getByText(/Stock ajustado \(\+1\)/)).toBeVisible({ timeout: 10_000 });
  });
});
