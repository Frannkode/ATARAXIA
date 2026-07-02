export function buildCatalogHref({
  page,
  categoryId,
  search,
}: {
  page?: number;
  categoryId?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  if (categoryId) params.set("categoryId", categoryId);
  if (search) params.set("search", search);
  if (page && page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/?${query}` : "/";
}
