/**
 * Seed de desarrollo. Los productos/categorías son de placeholder — se
 * reemplazan por los reales en cuanto el cliente los provea (ver DoR del
 * Sprint 1 en Context/Preguntas-Cliente.md). El objetivo acá es tener datos
 * de forma real para probar catálogo, filtro y ficha de producto.
 */
import { db } from "./index";
import { categories, productImages, products } from "./schema";

const PLACEHOLDER_IMAGE = (seed: string, index: number) =>
  `https://placehold.co/800x1000?text=${encodeURIComponent(seed)}+${index}`;

async function seed() {
  console.log("Borrando datos existentes...");
  await db.delete(productImages);
  await db.delete(products);
  await db.delete(categories);

  console.log("Insertando categorías...");
  const [remeras, pantalones, accesorios] = await db
    .insert(categories)
    .values([
      { name: "Remeras", slug: "remeras" },
      { name: "Pantalones", slug: "pantalones" },
      { name: "Accesorios", slug: "accesorios" },
    ])
    .returning();

  if (!remeras || !pantalones || !accesorios) {
    throw new Error("No se pudieron crear las categorías base del seed");
  }

  console.log("Insertando productos...");
  const insertedProducts = await db
    .insert(products)
    .values([
      {
        name: "Remera Oversize Lila",
        slug: "remera-oversize-lila",
        description: "Remera oversize de algodón peinado, ideal para uso diario.",
        sku: "REM-001",
        retailPrice: "18000.00",
        wholesalePrice: "14000.00",
        wholesaleMinQty: 6,
        stock: 40,
        categoryId: remeras.id,
      },
      {
        name: "Remera Básica Negra",
        slug: "remera-basica-negra",
        description: "Remera básica de algodón, corte clásico.",
        sku: "REM-002",
        retailPrice: "15000.00",
        wholesalePrice: "11500.00",
        wholesaleMinQty: 6,
        stock: 60,
        categoryId: remeras.id,
      },
      {
        name: "Pantalón Cargo Gris",
        slug: "pantalon-cargo-gris",
        description: "Pantalón cargo de gabardina con bolsillos laterales.",
        sku: "PAN-001",
        retailPrice: "32000.00",
        wholesalePrice: "26000.00",
        wholesaleMinQty: 4,
        stock: 25,
        categoryId: pantalones.id,
      },
      {
        name: "Gorra Bordada",
        slug: "gorra-bordada",
        description: "Gorra de six panels con logo bordado.",
        sku: "ACC-001",
        retailPrice: "9000.00",
        wholesalePrice: null,
        wholesaleMinQty: null,
        stock: 0,
        categoryId: accesorios.id,
      },
    ])
    .returning();

  console.log("Insertando imágenes de producto...");
  for (const product of insertedProducts) {
    await db.insert(productImages).values([
      { productId: product.id, url: PLACEHOLDER_IMAGE(product.slug, 1), position: 0 },
      { productId: product.id, url: PLACEHOLDER_IMAGE(product.slug, 2), position: 1 },
      { productId: product.id, url: PLACEHOLDER_IMAGE(product.slug, 3), position: 2 },
    ]);
  }

  console.log(`Seed completo: ${insertedProducts.length} productos en 3 categorías.`);
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error corriendo el seed:", error);
    process.exit(1);
  });
