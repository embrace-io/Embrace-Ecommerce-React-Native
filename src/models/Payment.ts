export type PaymentType =
  | 'creditCard'
  | 'debitCard'
  | 'applePay'
  | 'googlePay'
  | 'paypal';

export interface CardInfo {
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  holderName: string;
}

export interface DigitalWalletInfo {
  email: string;
  displayName: string;
}

export interface PaymentMethod {
  id: string;
  type: PaymentType;
  cardInfo?: CardInfo;
  digitalWalletInfo?: DigitalWalletInfo;
  isDefault: boolean;
}

export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed';

export interface PaymentResult {
  status: PaymentStatus;
  paymentIntentId?: string;
  errorMessage?: string;
}
