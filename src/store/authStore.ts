import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {User, AuthenticationState, AuthenticationMethod} from '../models/User';
import {apiService} from '../services/api';
import {embraceService} from '../services/embrace';

interface AuthState {
  user: User | null;
  token: string | null;
  authState: AuthenticationState;
  authMethod: AuthenticationMethod | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  guestCheckout: () => Promise<void>;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      authState: 'unauthenticated',
      authMethod: null,

      login: async (email: string, password: string) => {
        set({authState: 'authenticating'});
        embraceService.addBreadcrumb('LOGIN_ATTEMPT');

        try {
          const {user, token} = await apiService.login(email, password);

          // Note: API service already handles trackLoginSuccess with full details
          // Just update any additional session properties here
          embraceService.addSessionProperty('user_type', 'registered');

          set({
            user,
            token,
            authState: 'authenticated',
            authMethod: 'email',
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          embraceService.trackLoginFailure('email', errorMessage);
          set({authState: 'error'});
          throw error;
        }
      },

      register: async (email: string, password: string, firstName: string, lastName: string) => {
        set({authState: 'authenticating'});
        embraceService.addBreadcrumb('REGISTRATION_ATTEMPT');

        try {
          const {user, token} = await apiService.register(email, password, firstName, lastName);

          embraceService.setUserIdentifier(user.id);
          embraceService.setUserEmail(user.email);
          embraceService.setUsername(`${user.firstName} ${user.lastName}`);
          embraceService.logInfo('User registered', {userId: user.id});
          embraceService.addSessionProperty('user_type', 'registered');

          set({
            user,
            token,
            authState: 'authenticated',
            authMethod: 'email',
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          embraceService.logError('Registration failed', {error: errorMessage});
          set({authState: 'error'});
          throw error;
        }
      },

      guestCheckout: async () => {
        set({authState: 'authenticating'});
        embraceService.addBreadcrumb('GUEST_CHECKOUT_ATTEMPT');

        try {
          const {user, token} = await apiService.guestCheckout();

          // Note: API service already handles trackLoginSuccess with full details
          embraceService.addSessionProperty('user_type', 'guest');

          set({
            user,
            token,
            authState: 'authenticated',
            authMethod: 'guest',
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          embraceService.trackLoginFailure('guest', errorMessage);
          set({authState: 'error'});
          throw error;
        }
      },

      logout: () => {
        embraceService.trackLogout();
        set({
          user: null,
          token: null,
          authState: 'unauthenticated',
          authMethod: null,
        });
      },

      isAuthenticated: () => {
        const state = get();
        return state.authState === 'authenticated' && state.user !== null;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({
        user: state.user,
        token: state.token,
        authState: state.authState === 'authenticated' ? 'authenticated' : 'unauthenticated',
        authMethod: state.authMethod,
      }),
    },
  ),
);
