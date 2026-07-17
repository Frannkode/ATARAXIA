"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { previewPrice } from "@/actions/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/lib/cart-store";
import { formatPrice } from "@/lib/format";
import type { LineItemPrice } from "@/lib/pricing";

export function ProductPurchaseBox({
  productId,
  wholesaleMinQty,
  outOfStock,
  initialPreview,
}: {
  productId: string;
  wholesaleMinQty: number | null;
  outOfStock: boolean;
  initialPreview: LineItemPrice;
}) {
  const [quantity, setQuantity] = useState(1);
  const [preview, setPreview] = useState<LineItemPrice | null>(initialPreview);
  const [hasError, setHasError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useState(false);
  const isFirstRender = useRef(true);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    // La cantidad inicial (1) ya vino calculada desde el servidor
    // (initialPreview): no repetir la misma llamada apenas monta.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    startTransition(async () => {
      const result = await previewPrice(productId, quantity);
      setPreview(result);
      setHasError(result === null);
    });
  }, [productId, quantity]);

  function handleQuantityChange(value: string) {
    const parsed = Math.floor(Number(value));
    setQuantity(Number.isFinite(parsed) && parsed > 0 ? parsed : 1);
    setAdded(false);
  }

  function handleAddToCart() {
    addItem(productId, quantity);
    setAdded(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="text-sm font-medium text-foreground">
          Cantidad
        </label>
        <Input
          id="quantity"
          type="number"
          min={1}
          value={quantity}
          disabled={outOfStock}
          onChange={(event) => handleQuantityChange(event.target.value)}
          className="w-20"
        />
      </div>

      {wholesaleMinQty && (
        <p className="text-xs text-muted-foreground">
          A partir de {wholesaleMinQty} unidades, precio mayorista
        </p>
      )}

      {hasError && !isPending && (
        <p className="text-sm text-destructive">No pudimos calcular el precio. Reintentá.</p>
      )}

      {preview && !isPending && !hasError && (
        <p className="text-sm text-foreground">
          {formatPrice(preview.unitPrice)} c/u
          {preview.isWholesale && <span className="ml-1 text-primary">(mayorista)</span>}
          <span className="text-muted-foreground"> · Total: {formatPrice(preview.lineTotal)}</span>
        </p>
      )}

      <Button onClick={handleAddToCart} disabled={outOfStock} className="w-fit">
        {outOfStock ? "Sin stock" : added ? "¡Agregado!" : "Agregar al carrito"}
      </Button>
    </div>
  );
}
