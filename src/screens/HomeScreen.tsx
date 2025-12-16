import React, {useEffect, useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  FlatList,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {Product, Category} from '../models/Product';
import {apiService} from '../services/api';
import {embraceService} from '../services/embrace';
import {ProductCard, CategoryCard, LoadingSpinner} from '../components';
import {RootStackParamList} from '../navigation/types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      embraceService.addBreadcrumb('HOME_SCREEN_LOAD');
      const [featured, arrivals, cats] = await Promise.all([
        apiService.fetchFeaturedProducts(),
        apiService.fetchNewArrivals(),
        apiService.fetchCategories(),
      ]);
      setFeaturedProducts(featured);
      setNewArrivals(arrivals);
      setCategories(cats);
    } catch (error) {
      embraceService.logError('Failed to load home screen data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleProductPress = (product: Product) => {
    embraceService.trackProductViewed(product.id, product.name);
    navigation.navigate('ProductDetail', {productId: product.id});
  };

  const handleCategoryPress = (category: Category) => {
    embraceService.addBreadcrumb(`CATEGORY_SELECTED_${category.name}`);
    navigation.navigate('ProductList', {
      category: category.name,
      title: category.name,
    });
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome to</Text>
        <Text style={styles.brandName}>Embrace Shop</Text>
      </View>

      {/* Featured Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Featured Products</Text>
        <FlatList
          horizontal
          data={featuredProducts}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <ProductCard
              product={item}
              onPress={() => handleProductPress(item)}
              compact
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shop by Category</Text>
        <View style={styles.categoryGrid}>
          {categories.map(category => (
            <CategoryCard
              key={category.id}
              category={category}
              onPress={() => handleCategoryPress(category)}
            />
          ))}
        </View>
      </View>

      {/* New Arrivals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>New Arrivals</Text>
        <FlatList
          horizontal
          data={newArrivals}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <ProductCard
              product={item}
              onPress={() => handleProductPress(item)}
              compact
            />
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  horizontalList: {
    paddingHorizontal: 16,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  bottomPadding: {
    height: 20,
  },
});
