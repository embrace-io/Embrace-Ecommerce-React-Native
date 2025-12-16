import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {CartItem} from '../models/Cart';

interface CartItemCardProps {
  item: CartItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}

export const CartItemCard: React.FC<CartItemCardProps> = ({
  item,
  onUpdateQuantity,
  onRemove,
}) => {
  const variants = Object.entries(item.selectedVariants)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ');

  return (
    <View style={styles.container}>
      <Image
        source={{uri: item.product.imageUrls[0]}}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.brand}>{item.product.brand}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {item.product.name}
        </Text>
        {variants ? (
          <Text style={styles.variants}>{variants}</Text>
        ) : null}
        <Text style={styles.price}>
          ${(item.unitPrice * item.quantity).toFixed(2)}
        </Text>
      </View>
      <View style={styles.actions}>
        <View style={styles.quantityContainer}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(item.quantity - 1)}>
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => onUpdateQuantity(item.quantity + 1)}>
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <Text style={styles.removeText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  brand: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
    marginBottom: 4,
  },
  variants: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  actions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  quantity: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 8,
    minWidth: 30,
    textAlign: 'center',
  },
  removeButton: {
    padding: 4,
  },
  removeText: {
    fontSize: 12,
    color: '#e74c3c',
    fontWeight: '500',
  },
});
