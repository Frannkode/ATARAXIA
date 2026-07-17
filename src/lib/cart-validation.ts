import type { CartItem } from "@/lib/cart-store";
import type { ProductWithRelations } from "@/db/queries/products";

export type CartItemInvalidReason =
  | "not_found"
  | "inactive"
  | "insufficient_stock"
  | "invalid_quantity";

export interface ValidatedCartItem {
  productId: string;
  quantity: number;
  product: ProductWithRelations | null;
  valid: boolean;
  reason?: CartItemInvalidReason;
  maxAvailable?: number;
}

// El store de Zustand nunca genera productId duplicados (addItem mergea), pero
// los Server Actions son POSTs invocables directamente sin pasar por el
// store — un request armado a mano puede mandar el mismo producto dos veces.
// Sin este merge, createOrder generaría dos orderItems para el mismo
// producto y evaluaría wholesaleMinQty por línea fragmentada en vez de por
// la cantidad total pedida.
function mergeCartItems(items: CartItem[]): CartItem[] {
  const quantityByProductId = new Map<string, number>();
  for (const item of items) {
    quantityByProductId.set(
      item.productId,
      (quantityByProductId.get(item.productId) ?? 0) + item.quantity,
    );
  }
  return Array.from(quantityByProductId, ([productId, quantity]) => ({ productId, quantity }));
}

/**
 * Una sola regla de "qué hace inválido un item de carrito", reusada tanto
 * para mostrar avisos en el carrito como para bloquear el submit del
 * checkout (Historia 2.4) — evita que las dos versiones diverjan.
 */
export function validateCartItems(
  items: CartItem[],
  products: ProductWithRelations[],
): ValidatedCartItem[] {
  const productsById = new Map(products.map((product) => [product.id, product]));

  return mergeCartItems(items).map((item) => {
    const product = productsById.get(item.productId) ?? null;

    // Los Server Actions son POSTs invocables directamente, sin pasar por el
    // clamping del cliente (cart-store.ts, product-purchase-box.tsx). Sin
    // este chequeo, un request armado a mano con quantity 0/negativa/decimal
    // pasaba como "válido" acá y después calculateLineItem() tiraba una
    // excepción sin atrapar en createOrder/resolveCart.
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      return {
        productId: item.productId,
        quantity: item.quantity,
        product,
        valid: false,
        reason: "invalid_quantity",
      };
    }

    if (!product) {
      return {
        productId: item.productId,
        quantity: item.quantity,
        product: null,
        valid: false,
        reason: "not_found",
      };
    }

    if (!product.active) {
      return {
        productId: item.productId,
        quantity: item.quantity,
        product,
        valid: false,
        reason: "inactive",
      };
    }

    if (product.stock < item.quantity) {
      return {
        productId: item.productId,
        quantity: item.quantity,
        product,
        valid: false,
        reason: "insufficient_stock",
        maxAvailable: product.stock,
      };
    }

    return { productId: item.productId, quantity: item.quantity, product, valid: true };
  });
}
