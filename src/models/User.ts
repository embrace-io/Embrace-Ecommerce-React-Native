export interface UserPreferences {
  newsletter: boolean;
  pushNotifications: boolean;
  biometricAuth: boolean;
  preferredCurrency: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateJoined: string;
  isGuest: boolean;
  preferences: UserPreferences;
  profileImageUrl?: string;
}

export type AuthenticationMethod = 'email' | 'google' | 'guest' | 'biometric';

export type AuthenticationState =
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'error';

export interface AuthenticatedUser extends User {
  accessToken: string;
  refreshToken?: string;
  authMethod: AuthenticationMethod;
}
