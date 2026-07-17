import Image from "next/image";
import Link from "next/link";
import type { ProductWithRelations } from "@/db/queries/products";
import { formatPrice } from "@/lib/format";
import { PLACEHOLDER_PRODUCT_IMAGE } from "@/lib/placeholder-image";

export function ProductCard({ product }: { product: ProductWithRelations }) {
  const coverImage = product.images[0]?.url ?? PLACEHOLDER_PRODUCT_IMAGE;
  const outOfStock = product.stock <= 0;

  return (
    <Link
      href={`/productos/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border transition-shadow hover:shadow-md"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-muted">
        <Image
          src={coverImage}
          alt={product.name}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover transition-transform group-hover:scale-105"
        />
        {outOfStock && (
          <span className="absolute top-2 left-2 rounded-full bg-black/80 px-2 py-1 text-xs font-medium text-white">
            Sin stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        {product.category && (
          <span className="text-xs text-muted-foreground">{product.category.name}</span>
        )}
        <h3 className="text-sm font-medium text-foreground">{product.name}</h3>
        <p className="mt-auto text-sm font-semibold text-foreground">
          {formatPrice(product.retailPrice)}
        </p>
      </div>
    </Link>
  );
}
