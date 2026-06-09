import { create } from "zustand";

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  maxQuantity: number; // max based on stock availability
}

interface CartStore {
  items: CartItem[];
  paymentType: string;
  addItem: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  clearCart: () => void;
  setPaymentType: (type: string) => void;
  totalAmount: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  paymentType: "CASH",

  addItem: (item) => {
    set((state) => {
      const existing = state.items.find(
        (i) => i.productId === item.productId
      );
      if (existing) {
        // Check if we can increment
        if (existing.quantity < existing.maxQuantity) {
          return {
            items: state.items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          };
        }
        return state; // Already at max
      }
      return {
        items: [...state.items, { ...item, quantity: item.quantity ?? 1 }],
      };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((i) => i.productId !== productId),
    }));
  },

  updateQuantity: (productId, quantity) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(Math.max(1, quantity), i.maxQuantity) }
          : i
      ),
    }));
  },

  incrementQuantity: (productId) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId && i.quantity < i.maxQuantity
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ),
    }));
  },

  decrementQuantity: (productId) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.productId === productId && i.quantity > 1
          ? { ...i, quantity: i.quantity - 1 }
          : i
      ),
    }));
  },

  clearCart: () => set({ items: [] }),

  setPaymentType: (type) => set({ paymentType: type }),

  totalAmount: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
}));