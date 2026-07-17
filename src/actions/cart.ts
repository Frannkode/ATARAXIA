"use server";

import { getProductsByIds } from "@/db/queries/products";
import type { CartItem } from "@/lib/cart-store";
import { validateCartItems, type ValidatedCartItem } from "@/lib/cart-validation";
import { calculateLineItem } from "@/lib/pricing";

export interface ResolvedCart {
  items: ValidatedCartItem[];
  subtotal: number;
  hasInvalidItems: boolean;
}

export async function resolveCart(items: CartItem[]): Promise<ResolvedCart> {
  if (items.length === 0) {
    return { items: [], subtotal: 0, hasInvalidItems: false };
  }

  const products = await getProductsByIds(items.map((item) => item.productId));
  const validated = validateCartItems(items, products);

  const subtotal = validated
    .filter((item) => item.valid && item.product)
    .reduce((sum, item) => sum + calculateLineItem(item.product!, item.quantity).lineTotal, 0);

  return {
    items: validated,
    subtotal,
    hasInvalidItems: validated.some((item) => !item.valid),
  };
}
