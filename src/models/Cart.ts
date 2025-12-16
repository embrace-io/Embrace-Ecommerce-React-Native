import {Product} from './Product';

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  selectedVariants: Record<string, string>;
  unitPrice: number;
  addedAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  updatedAt: string;
}

export const calculateCartTotals = (items: CartItem[]) => {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0,
  );
  return {totalItems, subtotal};
};
