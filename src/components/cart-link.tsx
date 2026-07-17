"use client";

import Link from "next/link";
import { useCartHasHydrated, useCartStore } from "@/lib/cart-store";

export function CartLink() {
  const items = useCartStore((state) => state.items);
  const hasHydrated = useCartHasHydrated();

  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Link href="/carrito" className="text-sm font-medium text-foreground hover:text-primary">
      Carrito{hasHydrated && count > 0 ? ` (${count})` : ""}
    </Link>
  );
}
