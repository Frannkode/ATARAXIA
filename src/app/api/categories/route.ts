import { getCategories } from "@/db/queries/categories";

export async function GET() {
  const categories = await getCategories();
  return Response.json({ categories });
}
