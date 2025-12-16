export type AddressType = 'shipping' | 'billing' | 'both';

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  addressType: AddressType;
  isDefault: boolean;
  phoneNumber?: string;
}

export const formatAddress = (address: Address): string => {
  const lines = [
    `${address.firstName} ${address.lastName}`,
    address.street,
    address.street2,
    `${address.city}, ${address.state} ${address.zipCode}`,
    address.country,
  ].filter(Boolean);
  return lines.join('\n');
};
