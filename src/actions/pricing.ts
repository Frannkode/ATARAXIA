"use server";

import { getProductById } from "@/db/queries/products";
import { calculateLineItem, type LineItemPrice } from "@/lib/pricing";

export async function previewPrice(
  productId: string,
  quantity: number,
): Promise<LineItemPrice | null> {
  const product = await getProductById(productId);
  if (!product) return null;

  try {
    return calculateLineItem(product, quantity);
  } catch {
    return null;
  }
}
