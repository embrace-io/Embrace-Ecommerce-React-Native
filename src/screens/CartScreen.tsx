import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useCartStore} from '../store/cartStore';
import {useAuthStore} from '../store/authStore';
import {embraceService} from '../services/embrace';
import {CartItemCard, Button, EmptyState} from '../components';
import {RootStackParamList} from '../navigation/types';

type CartScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const {items, totalItems, subtotal, updateQuantity, removeItem, clearCart} =
    useCartStore();
  const {isAuthenticated} = useAuthStore();

  const handleCheckout = () => {
    embraceService.trackCheckoutStarted();

    if (!isAuthenticated()) {
      navigation.navigate('Auth', {returnTo: 'Checkout'});
    } else {
      navigation.navigate('Checkout');
    }
  };

  const handleClearCart = () => {
    Alert.alert(
      'Clear Cart',
      'Are you sure you want to remove all items from your cart?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            clearCart();
            embraceService.addBreadcrumb('CART_CLEARED');
          },
        },
      ],
    );
  };

  const handleContinueShopping = () => {
    navigation.navigate('MainTabs', {screen: 'Home'});
  };

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your Cart is Empty"
        message="Looks like you haven't added anything to your cart yet"
        actionTitle="Start Shopping"
        onAction={handleContinueShopping}
        icon="🛒"
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.itemCount}>
          {totalItems} {totalItems === 1 ? 'item' : 'items'}
        </Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Text style={styles.clearText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Items */}
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={({item}) => (
          <CartItemCard
            item={item}
            onUpdateQuantity={qty => updateQuantity(item.id, qty)}
            onRemove={() => removeItem(item.id)}
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Summary & Checkout */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
        </View>
        <Text style={styles.taxNote}>
          Shipping and taxes calculated at checkout
        </Text>
        <Button title="Proceed to Checkout" onPress={handleCheckout} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clearText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: '500',
  },
  listContainer: {
    padding: 16,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  taxNote: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
});
