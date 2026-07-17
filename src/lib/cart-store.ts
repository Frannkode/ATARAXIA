import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

// Guarda solo { productId, quantity } — nunca una copia del producto
// (nombre/precio/imagen). Los datos frescos se resuelven contra la base cada
// vez que se muestra el carrito (ver getProductsByIds + validateCartItems),
// así un producto desactivado o con precio cambiado nunca se ve desactualizado.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (productId, quantity) =>
        set((state) => {
          const existing = state.items.find((item) => item.productId === productId);
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.productId === productId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item,
              ),
            };
          }
          return { items: [...state.items, { productId, quantity }] };
        }),
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((item) => item.productId !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((item) => item.productId !== productId) };
          }
          return {
            items: state.items.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
            ),
          };
        }),
      clear: () => set({ items: [] }),
    }),
    {
      name: "cart-storage",
      // Si localStorage.setItem() tira (privado estricto, storage lleno),
      // zustand/persist NO lo atrapa en el path de escritura (solo en la
      // rehidratación inicial) — verificado en node_modules/zustand/middleware.js.
      // El estado en memoria ya se actualizó igual (setState corre antes que
      // setItem), así que el peor caso es: la acción funciona para la sesión
      // actual, pero no persiste al recargar. No hace falta un try/catch acá
      // porque no hay nada mejor que hacer en ese escenario — el fallback ya
      // es "el carrito sigue andando, solo no sobrevive un refresh".
    },
  ),
);

// El store se hidrata desde localStorage (no existe en el server), así que
// el conteo real solo se conoce del lado del cliente. useSyncExternalStore
// evita el mismatch de hidratación sin recurrir a un useEffect + setState
// (ese patrón dispara un re-render en cascada que el linter marca).
export function useCartHasHydrated() {
  return useSyncExternalStore(
    (callback) => useCartStore.persist.onFinishHydration(callback),
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );
}
