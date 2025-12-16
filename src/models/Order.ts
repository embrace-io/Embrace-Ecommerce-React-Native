import {Address} from './Address';
import {PaymentMethod} from './Payment';

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedVariants: Record<string, string>;
  imageUrl?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: OrderItem[];
  shippingAddress: Address;
  billingAddress: Address;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  estimatedDelivery?: string;
  trackingNumber?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  description: string;
  cost: number;
  estimatedDays: number;
  isAvailable: boolean;
  trackingIncluded: boolean;
}
