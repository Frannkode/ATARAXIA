export function buildCatalogHref({ page, categoryId }: { page?: number; categoryId?: string }) {
  const params = new URLSearchParams();
  if (categoryId) params.set("categoryId", categoryId);
  if (page && page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/?${query}` : "/";
}
