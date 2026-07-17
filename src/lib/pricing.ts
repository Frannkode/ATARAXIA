// Drizzle devuelve las columnas `numeric` (retailPrice/wholesalePrice) como
// string, no number. Toda la aritmética de precios pasa por esta función:
// convierte a Number acá (frontera única), calcula en JS number, y quien
// persista el resultado (Historia 2.4, orderItem) lo vuelve a convertir a
// string al escribir.
export interface PricedProduct {
  retailPrice: string;
  wholesalePrice: string | null;
  wholesaleMinQty: number | null;
}

export interface LineItemPrice {
  unitPrice: number;
  lineTotal: number;
  isWholesale: boolean;
}

export function calculateLineItem(product: PricedProduct, quantity: number): LineItemPrice {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error(`Cantidad inválida: ${quantity}`);
  }

  const retailPrice = Number(product.retailPrice);
  const wholesalePrice = product.wholesalePrice !== null ? Number(product.wholesalePrice) : null;
  const wholesaleMinQty = product.wholesaleMinQty;

  if (wholesalePrice !== null && wholesaleMinQty !== null && quantity >= wholesaleMinQty) {
    return { unitPrice: wholesalePrice, lineTotal: wholesalePrice * quantity, isWholesale: true };
  }

  return { unitPrice: retailPrice, lineTotal: retailPrice * quantity, isWholesale: false };
}
