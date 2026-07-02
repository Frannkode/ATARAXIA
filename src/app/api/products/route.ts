import { db } from "@/db";

export async function GET() {
  const products = await db.query.products.findMany({
    where: (product, { eq }) => eq(product.active, true),
    orderBy: (product, { desc }) => desc(product.createdAt),
    with: {
      category: true,
      images: {
        orderBy: (image, { asc }) => asc(image.position),
      },
    },
  });

  return Response.json({ products });
}
