export interface ProductVariant {
  id: string;
  type: 'size' | 'color' | 'style';
  name: string;
  value: string;
  priceModifier: number;
  inStock: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrls: string[];
  category: string;
  brand: string;
  variants: ProductVariant[];
  inStock: boolean;
  stockCount: number;
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  weight?: number;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  imageUrl: string;
  productCount: number;
}
