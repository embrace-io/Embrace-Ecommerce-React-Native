import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Product} from '../models/Product';

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  compact?: boolean;
}

const {width} = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  compact = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.container, compact && styles.compactContainer]}
      onPress={onPress}
      activeOpacity={0.8}>
      <Image
        source={{uri: product.imageUrls[0]}}
        style={[styles.image, compact && styles.compactImage]}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>
            ${product.price.toFixed(2)}
          </Text>
      {!product.inStock && (
        <View style={styles.outOfStockOverlay}>
          <Text style={styles.outOfStockText}>Out of Stock</Text>
        </View>
      )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  compactContainer: {
    width: 150,
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: cardWidth,
    backgroundColor: '#f5f5f5',
  },
  compactImage: {
    height: 150,
  },
  info: {
    padding: 12,
  },
  brand: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  outOfStock: {
    fontSize: 10,
    color: '#e74c3c',
    fontWeight: '600',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#c0392b',
    fontWeight: 'bold',
    fontSize: 16,
    textTransform: 'uppercase',
  },
});
