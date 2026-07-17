"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { resolveCart, type ResolvedCart } from "@/actions/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import { PLACEHOLDER_PRODUCT_IMAGE } from "@/lib/placeholder-image";
import type { CartItemInvalidReason } from "@/lib/cart-validation";
import { calculateLineItem } from "@/lib/pricing";

const INVALID_REASON_LABEL: Record<CartItemInvalidReason, string> = {
  not_found: "Este producto ya no existe.",
  inactive: "Ya no está disponible.",
  insufficient_stock: "No hay stock suficiente.",
  invalid_quantity: "Cantidad inválida.",
};

export default function CartPage() {
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const [resolved, setResolved] = useState<ResolvedCart | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await resolveCart(items);
      setResolved(result);
    });
  }, [items]);

  if (isPending && !resolved) {
    return <main className="mx-auto max-w-3xl px-6 py-10">Cargando carrito...</main>;
  }

  if (!resolved || resolved.items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold text-foreground">Carrito</h1>
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
          Tu carrito está vacío.{" "}
          <Link href="/" className="text-foreground underline">
            Ver catálogo
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">Carrito</h1>

      <ul className="flex flex-col gap-4">
        {resolved.items.map((item) => (
          <li
            key={item.productId}
            className="flex items-center gap-4 rounded-lg border border-border p-3"
          >
            <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
              <Image
                src={item.product?.images[0]?.url ?? PLACEHOLDER_PRODUCT_IMAGE}
                alt={item.product?.name ?? ""}
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>

            <div className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                {item.product?.name ?? "Producto"}
              </span>

              {!item.valid && (
                <span className="text-sm text-destructive">
                  {INVALID_REASON_LABEL[item.reason!]}
                  {item.reason === "insufficient_stock" && ` (quedan ${item.maxAvailable})`}
                </span>
              )}

              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(event) =>
                    updateQuantity(
                      item.productId,
                      Math.max(0, Math.floor(Number(event.target.value)) || 0),
                    )
                  }
                  className="w-20"
                />
                <Button variant="outline" size="sm" onClick={() => removeItem(item.productId)}>
                  Quitar
                </Button>
              </div>
            </div>

            {item.valid && item.product && (
              <span className="text-right text-sm font-medium text-foreground">
                {(() => {
                  // No mostrar retailPrice a secas acá: con cantidad >=
                  // wholesaleMinQty el precio real es el mayorista, y este
                  // renglón tiene que coincidir con lo que ya suma el
                  // subtotal (calculado con la misma función).
                  const price = calculateLineItem(item.product, item.quantity);
                  return (
                    <>
                      {formatPrice(price.unitPrice)} c/u
                      <br />
                      {formatPrice(price.lineTotal)}
                    </>
                  );
                })()}
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
        <span className="text-lg font-semibold text-foreground">
          Subtotal: {formatPrice(resolved.subtotal)}
        </span>
        <Button disabled={resolved.hasInvalidItems} asChild={!resolved.hasInvalidItems}>
          {resolved.hasInvalidItems ? (
            <span>Resolvé los items marcados para continuar</span>
          ) : (
            <Link href="/checkout">Ir a pagar</Link>
          )}
        </Button>
      </div>
    </main>
  );
}
