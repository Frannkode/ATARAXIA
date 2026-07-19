import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/product-gallery";
import { ProductPurchaseBox } from "@/components/product-purchase-box";
import { getProductById } from "@/db/queries/products";
import { buildCatalogHref } from "@/lib/catalog-url";
import { calculateLineItem } from "@/lib/pricing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) return {};

  const image = product.images[0]?.url;

  return {
    title: product.name,
    description: product.description ?? undefined,
    openGraph: {
      title: product.name,
      description: product.description ?? undefined,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);

  if (!product) {
    notFound();
  }

  const outOfStock = product.stock <= 0;
  const initialPreview = calculateLineItem(product, 1);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    sku: product.sku,
    image: product.images.map((image) => image.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "ARS",
      price: product.retailPrice,
      availability: outOfStock
        ? "https://schema.org/OutOfStock"
        : "https://schema.org/InStock",
    },
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
        ← Volver al catálogo
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div className="flex flex-col gap-4">
          {product.category && (
            <Link
              href={buildCatalogHref({ categoryId: product.category.id })}
              className="w-fit text-sm text-muted-foreground hover:text-foreground"
            >
              {product.category.name}
            </Link>
          )}

          <h1 className="text-2xl font-semibold text-foreground">{product.name}</h1>

          <ProductPurchaseBox
            productId={product.id}
            wholesaleMinQty={product.wholesaleMinQty}
            outOfStock={outOfStock}
            initialPreview={initialPreview}
          />

          <p className="text-sm font-medium">
            {outOfStock ? (
              <span className="text-destructive">Sin stock</span>
            ) : (
              <span className="text-muted-foreground">En stock</span>
            )}
          </p>

          {product.description && (
            <p className="whitespace-pre-line text-foreground">{product.description}</p>
          )}

          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
        </div>
      </div>
    </main>
  );
}
