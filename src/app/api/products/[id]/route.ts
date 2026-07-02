import { db } from "@/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const product = await db.query.products.findFirst({
    where: (product, { eq }) => eq(product.id, id),
    with: {
      category: true,
      images: {
        orderBy: (image, { asc }) => asc(image.position),
      },
    },
  });

  if (!product) {
    return Response.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  return Response.json({ product });
}
