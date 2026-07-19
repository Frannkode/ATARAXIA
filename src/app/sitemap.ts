import type { MetadataRoute } from "next";
import { getCategories } from "@/db/queries/categories";
import { getActiveProductsForSitemap } from "@/db/queries/products";
import { buildCatalogHref } from "@/lib/catalog-url";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [categories, products] = await Promise.all([
    getCategories(),
    getActiveProductsForSitemap(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/politica-de-cambios`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((category) => ({
    url: `${siteUrl}${buildCatalogHref({ categoryId: category.id })}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${siteUrl}/productos/${product.id}`,
    lastModified: product.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
