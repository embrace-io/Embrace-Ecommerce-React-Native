import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {useRoute, RouteProp, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Product, ProductVariant} from '../models/Product';
import {apiService} from '../services/api';
import {embraceService} from '../services/embrace';
import {useCartStore} from '../store/cartStore';
import {Button, LoadingSpinner} from '../components';
import {RootStackParamList} from '../navigation/types';

type ProductDetailRouteProp = RouteProp<RootStackParamList, 'ProductDetail'>;
type ProductDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const {width} = Dimensions.get('window');

export const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRouteProp>();
  const navigation = useNavigation<ProductDetailNavigationProp>();
  const {productId} = route.params;
  const addItem = useCartStore(state => state.addItem);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [productId]);

  const loadProduct = async () => {
    try {
      embraceService.addBreadcrumb(`PRODUCT_DETAIL_LOAD_${productId}`);
      const data = await apiService.fetchProductById(productId);
      if (data) {
        setProduct(data);

        // Track product view with full details
        embraceService.trackProductView({
          productId: data.id,
          productName: data.name,
          category: data.category,
          price: data.price,
        });

        // Set default variant selections
        const variantTypes = [...new Set(data.variants.map(v => v.type))];
        const defaults: Record<string, string> = {};
        variantTypes.forEach(type => {
          const firstAvailable = data.variants.find(
            v => v.type === type && v.inStock,
          );
          if (firstAvailable) {
            defaults[type] = firstAvailable.value;
          }
        });
        setSelectedVariants(defaults);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      embraceService.logError('Failed to load product', {
        'product.id': productId,
        'error.message': errorMessage,
      });
      if (error instanceof Error) {
        embraceService.logHandledError(error, {'product.id': productId});
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVariantSelect = (type: string, value: string) => {
    setSelectedVariants(prev => ({...prev, [type]: value}));
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Cart store handles telemetry for add to cart
    addItem(product, quantity, selectedVariants);
    setAddedToCart(true);

    // Track user action on this screen
    embraceService.trackUserAction('add_to_cart', 'ProductDetail', {
      'product.id': product.id,
      quantity: quantity.toString(),
    });

    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleGoToCart = () => {
    navigation.navigate('MainTabs', {screen: 'Cart'});
  };

  const getVariantsByType = (type: string): ProductVariant[] => {
    return product?.variants.filter(v => v.type === type) || [];
  };

  const getVariantTypes = (): string[] => {
    if (!product) return [];
    return [...new Set(product.variants.map(v => v.type))];
  };

  if (loading || !product) {
    return <LoadingSpinner fullScreen message="Loading product..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentImageIndex(index);
          }}>
          {product.imageUrls.map((url, index) => (
            <Image
              key={index}
              source={{uri: url}}
              style={styles.productImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>

        {/* Image Indicators */}
        {product.imageUrls.length > 1 && (
          <View style={styles.indicators}>
            {product.imageUrls.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.indicator,
                  index === currentImageIndex && styles.indicatorActive,
                ]}
              />
            ))}
          </View>
        )}

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.brand}>{product.brand}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>

          {/* Stock Status */}
          <View style={styles.stockContainer}>
            <View
              style={[
                styles.stockBadge,
                product.inStock ? styles.inStock : styles.outOfStock,
              ]}>
              <Text style={styles.stockText}>
                {product.inStock
                  ? `In Stock (${product.stockCount})`
                  : 'Out of Stock'}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>

          {/* Variants */}
          {getVariantTypes().map(type => (
            <View key={type} style={styles.variantSection}>
              <Text style={styles.variantTitle}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
              <View style={styles.variantOptions}>
                {getVariantsByType(type).map(variant => (
                  <TouchableOpacity
                    key={variant.id}
                    style={[
                      styles.variantOption,
                      selectedVariants[type] === variant.value &&
                        styles.variantSelected,
                      !variant.inStock && styles.variantDisabled,
                    ]}
                    onPress={() => handleVariantSelect(type, variant.value)}
                    disabled={!variant.inStock}>
                    <Text
                      style={[
                        styles.variantText,
                        selectedVariants[type] === variant.value &&
                          styles.variantTextSelected,
                        !variant.inStock && styles.variantTextDisabled,
                      ]}>
                      {variant.value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Quantity */}
          <View style={styles.quantitySection}>
            <Text style={styles.variantTitle}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}>
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(quantity + 1)}>
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        {addedToCart ? (
          <Button title="Go to Cart" onPress={handleGoToCart} />
        ) : (
          <Button
            title={product.inStock ? 'Add to Cart' : 'Out of Stock'}
            onPress={handleAddToCart}
            disabled={!product.inStock}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  productImage: {
    width,
    height: width,
    backgroundColor: '#f5f5f5',
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#000',
  },
  infoContainer: {
    padding: 20,
  },
  brand: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
  },
  stockContainer: {
    marginBottom: 20,
  },
  stockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  inStock: {
    backgroundColor: '#e8f5e9',
  },
  outOfStock: {
    backgroundColor: '#ffebee',
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  variantSection: {
    marginTop: 20,
  },
  variantTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  variantOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  variantOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
    marginBottom: 8,
  },
  variantSelected: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  variantDisabled: {
    opacity: 0.5,
  },
  variantText: {
    fontSize: 14,
    color: '#333',
  },
  variantTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  variantTextDisabled: {
    textDecorationLine: 'line-through',
  },
  quantitySection: {
    marginTop: 20,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 24,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});
