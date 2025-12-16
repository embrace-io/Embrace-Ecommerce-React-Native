import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuthStore} from '../store/authStore';
import {embraceService} from '../services/embrace';
import {Button, Input} from '../components';
import {RootStackParamList} from '../navigation/types';

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type AuthScreenRouteProp = RouteProp<RootStackParamList, 'Auth'>;

type AuthMode = 'login' | 'register';

export const AuthScreen: React.FC = () => {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const route = useRoute<AuthScreenRouteProp>();
  const {returnTo} = route.params || {};
  const {login, register, guestCheckout} = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (mode === 'register') {
      if (!firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
      if (password !== confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    embraceService.addBreadcrumb(`AUTH_${mode.toUpperCase()}_ATTEMPT`);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, firstName, lastName);
      }

      if (returnTo === 'Checkout') {
        navigation.replace('Checkout');
      } else {
        navigation.goBack();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert(
        mode === 'login' ? 'Login Failed' : 'Registration Failed',
        errorMessage,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGuestCheckout = async () => {
    if (returnTo !== 'Checkout') {
      return;
    }

    setLoading(true);
    embraceService.addBreadcrumb('GUEST_CHECKOUT_ATTEMPT');

    try {
      await guestCheckout();
      navigation.replace('Checkout');
    } catch (error) {
      Alert.alert('Error', 'Failed to continue as guest. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setErrors({});
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'login'
              ? 'Sign in to continue shopping'
              : 'Join us to start shopping'}
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === 'register' && (
            <View style={styles.row}>
              <Input
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                error={errors.firstName}
                placeholder="John"
                autoCapitalize="words"
                containerStyle={styles.halfInput}
              />
              <Input
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                error={errors.lastName}
                placeholder="Doe"
                autoCapitalize="words"
                containerStyle={styles.halfInput}
              />
            </View>
          )}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
            placeholder="john@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={errors.password}
            placeholder="Enter your password"
            secureTextEntry
          />

          {mode === 'register' && (
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={errors.confirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
            />
          )}

          <Button
            title={mode === 'login' ? 'Sign In' : 'Create Account'}
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitButton}
          />
        </View>

        {/* Toggle Mode */}
        <TouchableOpacity style={styles.toggleMode} onPress={toggleMode}>
          <Text style={styles.toggleText}>
            {mode === 'login'
              ? "Don't have an account? "
              : 'Already have an account? '}
            <Text style={styles.toggleLink}>
              {mode === 'login' ? 'Sign Up' : 'Sign In'}
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Guest Checkout Option */}
        {returnTo === 'Checkout' && (
          <View style={styles.guestSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              title="Continue as Guest"
              onPress={handleGuestCheckout}
              variant="outline"
              loading={loading}
            />
          </View>
        )}

        {/* Demo Credentials */}
        <View style={styles.demoCredentials}>
          <Text style={styles.demoTitle}>Demo Credentials:</Text>
          <Text style={styles.demoText}>Email: john.doe@example.com</Text>
          <Text style={styles.demoText}>Password: password123</Text>
          <TouchableOpacity
            onPress={() => {
              setEmail('john.doe@example.com');
              setPassword('password123');
            }}>
            <Text style={styles.fillButton}>Fill Demo Credentials</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    marginHorizontal: -8,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  submitButton: {
    marginTop: 8,
  },
  toggleMode: {
    alignItems: 'center',
    marginBottom: 24,
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
  },
  toggleLink: {
    color: '#007AFF',
    fontWeight: '600',
  },
  guestSection: {
    marginBottom: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#eee',
  },
  dividerText: {
    paddingHorizontal: 16,
    color: '#999',
    fontSize: 14,
  },
  demoCredentials: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  demoText: {
    fontSize: 13,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  fillButton: {
    marginTop: 12,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
