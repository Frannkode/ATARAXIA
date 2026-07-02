import { getProducts } from "@/db/queries/products";

function parsePositiveInt(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const result = await getProducts({
    page: parsePositiveInt(searchParams.get("page")),
    limit: parsePositiveInt(searchParams.get("limit")),
  });

  return Response.json(result);
}
