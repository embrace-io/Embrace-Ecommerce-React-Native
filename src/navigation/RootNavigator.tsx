import React from 'react';
import {StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {TabNavigator} from './TabNavigator';
import {
  ProductListScreen,
  ProductDetailScreen,
  CheckoutScreen,
  AuthScreen,
} from '../screens';
import {RootStackParamList} from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: 'Back',
        headerTitleStyle: styles.headerTitle,
        headerShadowVisible: false,
      }}>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{
          headerTitle: 'Products',
        }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{
          headerTitle: '',
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{
          headerTitle: 'Checkout',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Auth"
        component={AuthScreen}
        options={{
          headerTitle: 'Sign In',
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
});
