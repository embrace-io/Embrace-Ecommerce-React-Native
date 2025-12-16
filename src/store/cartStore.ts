import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {CartItem, calculateCartTotals} from '../models/Cart';
import {Product} from '../models/Product';
import {embraceService} from '../services/embrace';

interface CartState {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  addItem: (
    product: Product,
    quantity: number,
    selectedVariants?: Record<string, string>,
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemByProductId: (productId: string) => CartItem | undefined;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      totalItems: 0,
      subtotal: 0,

      addItem: (product: Product, quantity: number, selectedVariants = {}) => {
        set(state => {
          const existingItemIndex = state.items.findIndex(
            item =>
              item.productId === product.id &&
              JSON.stringify(item.selectedVariants) ===
                JSON.stringify(selectedVariants),
          );

          let newItems: CartItem[];
          const isNewItem = existingItemIndex < 0;

          if (existingItemIndex >= 0) {
            newItems = [...state.items];
            newItems[existingItemIndex] = {
              ...newItems[existingItemIndex],
              quantity: newItems[existingItemIndex].quantity + quantity,
            };
          } else {
            const newItem: CartItem = {
              id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              productId: product.id,
              product,
              quantity,
              selectedVariants,
              unitPrice: product.price,
              addedAt: new Date().toISOString(),
            };
            newItems = [...state.items, newItem];
          }

          const {totalItems, subtotal} = calculateCartTotals(newItems);

          // Track cart update with full info
          embraceService.trackAddToCart({
            productId: product.id,
            quantity,
            price: product.price,
            cartTotalItems: totalItems,
            cartSubtotal: subtotal,
          });

          // Log action type
          embraceService.logInfo(
            isNewItem ? 'New item added to cart' : 'Cart item quantity updated',
            {
              'product.id': product.id,
              'product.name': product.name,
              action: isNewItem ? 'new_item' : 'quantity_update',
            },
          );

          return {items: newItems, totalItems, subtotal};
        });
      },

      removeItem: (itemId: string) => {
        set(state => {
          const item = state.items.find(i => i.id === itemId);
          const newItems = state.items.filter(i => i.id !== itemId);
          const {totalItems, subtotal} = calculateCartTotals(newItems);

          if (item) {
            embraceService.trackRemoveFromCart(item.productId, totalItems);
            embraceService.logInfo('Item removed from cart', {
              'product.id': item.productId,
              'product.name': item.product.name,
              cart_total_items: totalItems.toString(),
            });
          }

          return {items: newItems, totalItems, subtotal};
        });
      },

      updateQuantity: (itemId: string, quantity: number) => {
        set(state => {
          const item = state.items.find(i => i.id === itemId);

          if (quantity <= 0) {
            const newItems = state.items.filter(i => i.id !== itemId);
            const {totalItems, subtotal} = calculateCartTotals(newItems);

            if (item) {
              embraceService.trackRemoveFromCart(item.productId, totalItems);
            }

            return {items: newItems, totalItems, subtotal};
          }

          const newItems = state.items.map(i =>
            i.id === itemId ? {...i, quantity} : i,
          );
          const {totalItems, subtotal} = calculateCartTotals(newItems);

          if (item) {
            embraceService.logInfo('Cart item quantity changed', {
              'product.id': item.productId,
              new_quantity: quantity.toString(),
              cart_total_items: totalItems.toString(),
            });
            embraceService.addSessionProperty(
              'cart_item_count',
              totalItems.toString(),
            );
          }

          return {items: newItems, totalItems, subtotal};
        });
      },

      clearCart: () => {
        embraceService.trackCartCleared();
        set({items: [], totalItems: 0, subtotal: 0});
      },

      getItemByProductId: (productId: string) => {
        return get().items.find(item => item.productId === productId);
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
