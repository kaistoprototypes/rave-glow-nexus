import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;       // shopify product GID
  variantId?: string;      // shopify variant GID — required for checkout
  slug: string;
  name: string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image_palette?: string[];
  image_url?: string;
};

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  add: (item: CartItem) => void;
  remove: (productId: string, size?: string, color?: string) => void;
  setQty: (productId: string, qty: number, size?: string, color?: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  subtotal: () => number;
  count: () => number;
};

const sameLine = (a: CartItem, b: CartItem) =>
  a.productId === b.productId && a.size === b.size && a.color === b.color;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      add: (item) =>
        set((s) => {
          const idx = s.items.findIndex((i) => sameLine(i, item));
          if (idx >= 0) {
            const next = [...s.items];
            next[idx] = { ...next[idx], quantity: next[idx].quantity + item.quantity };
            return { items: next, isOpen: true };
          }
          return { items: [...s.items, item], isOpen: true };
        }),
      remove: (productId, size, color) =>
        set((s) => ({ items: s.items.filter((i) => !(i.productId === productId && i.size === size && i.color === color)) })),
      setQty: (productId, qty, size, color) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.productId === productId && i.size === size && i.color === color
              ? { ...i, quantity: Math.max(1, qty) }
              : i,
          ),
        })),
      clear: () => set({ items: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    { name: "epe-cart", version: 2, migrate: () => ({ items: [], isOpen: false } as any) },
  ),
);
