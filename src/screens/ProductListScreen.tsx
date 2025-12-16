import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Product} from '../models/Product';
import {apiService} from '../services/api';
import {embraceService} from '../services/embrace';
import {ProductCard, LoadingSpinner, EmptyState} from '../components';
import {RootStackParamList} from '../navigation/types';

type ProductListRouteProp = RouteProp<RootStackParamList, 'ProductList'>;
type ProductListNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'name' | 'newest';

export const ProductListScreen: React.FC = () => {
  const navigation = useNavigation<ProductListNavigationProp>();
  const route = useRoute<ProductListRouteProp>();
  const {category, title} = route.params;

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [showSortModal, setShowSortModal] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    navigation.setOptions({title});
    loadProducts();
  }, [category, title, navigation]);

  const loadProducts = async () => {
    try {
      embraceService.addBreadcrumb(`PRODUCT_LIST_LOAD_${category}`);
      const data = await apiService.fetchProductsByCategory(category);
      setProducts(data);
      setFilteredProducts(data);
    } catch (error) {
      embraceService.logError('Failed to load products', {category});
    } finally {
      setLoading(false);
    }
  };

  const sortProducts = useCallback((productList: Product[], sort: SortOption): Product[] => {
    const sorted = [...productList];
    switch (sort) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case 'newest':
        return sorted.sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      default:
        return sorted;
    }
  }, []);

  useEffect(() => {
    let filtered = [...products];

    if (inStockOnly) {
      filtered = filtered.filter(p => p.inStock);
    }

    filtered = sortProducts(filtered, sortBy);
    setFilteredProducts(filtered);
  }, [products, sortBy, inStockOnly, sortProducts]);

  const handleProductPress = (product: Product) => {
    embraceService.trackProductViewed(product.id, product.name);
    navigation.navigate('ProductDetail', {productId: product.id});
  };

  const handleSortChange = (sort: SortOption) => {
    setSortBy(sort);
    setShowSortModal(false);
    embraceService.addBreadcrumb(`SORT_CHANGED_${sort}`);
  };

  const renderProduct = ({item, index}: {item: Product; index: number}) => (
    <View style={[styles.productWrapper, index % 2 === 0 && styles.leftProduct]}>
      <ProductCard product={item} onPress={() => handleProductPress(item)} />
    </View>
  );

  const getSortLabel = (sort: SortOption): string => {
    const labels: Record<SortOption, string> = {
      featured: 'Featured',
      price_asc: 'Price: Low to High',
      price_desc: 'Price: High to Low',
      name: 'Name',
      newest: 'Newest',
    };
    return labels[sort];
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading products..." />;
  }

  return (
    <View style={styles.container}>
      {/* Filters Bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowSortModal(true)}>
          <Text style={styles.filterText}>Sort: {getSortLabel(sortBy)}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, inStockOnly && styles.filterActive]}
          onPress={() => setInStockOnly(!inStockOnly)}>
          <Text style={[styles.filterText, inStockOnly && styles.filterTextActive]}>
            In Stock Only
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          title="No Products Found"
          message="Try adjusting your filters"
          icon="📦"
        />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sort By</Text>
            {(['featured', 'price_asc', 'price_desc', 'name', 'newest'] as SortOption[]).map(
              sort => (
                <TouchableOpacity
                  key={sort}
                  style={[
                    styles.sortOption,
                    sortBy === sort && styles.sortOptionActive,
                  ]}
                  onPress={() => handleSortChange(sort)}>
                  <Text
                    style={[
                      styles.sortOptionText,
                      sortBy === sort && styles.sortOptionTextActive,
                    ]}>
                    {getSortLabel(sort)}
                  </Text>
                </TouchableOpacity>
              ),
            )}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowSortModal(false)}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  filterBar: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginRight: 8,
  },
  filterActive: {
    backgroundColor: '#000',
  },
  filterText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  productWrapper: {
    flex: 1,
    maxWidth: '50%',
  },
  leftProduct: {
    paddingRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  sortOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sortOptionActive: {
    backgroundColor: '#f5f5f5',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  sortOptionText: {
    fontSize: 16,
    color: '#333',
  },
  sortOptionTextActive: {
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
});
