import React, {useState, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Product} from '../models/Product';
import {apiService} from '../services/api';
import {embraceService} from '../services/embrace';
import {ProductCard, EmptyState, LoadingSpinner} from '../components';
import {RootStackParamList} from '../navigation/types';

type SearchScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const RECENT_SEARCHES_KEY = 'recent_searches';
const MAX_RECENT_SEARCHES = 5;

export const SearchScreen: React.FC = () => {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadRecentSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Failed to load recent searches');
    }
  };

  const saveRecentSearch = async (searchQuery: string) => {
    try {
      const updated = [
        searchQuery,
        ...recentSearches.filter(s => s !== searchQuery),
      ].slice(0, MAX_RECENT_SEARCHES);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      setRecentSearches(updated);
    } catch (error) {
      console.log('Failed to save recent search');
    }
  };

  const clearRecentSearches = async () => {
    try {
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setRecentSearches([]);
    } catch (error) {
      console.log('Failed to clear recent searches');
    }
  };

  const handleSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      // API service handles trackSearch with full details
      const searchResults = await apiService.searchProducts(searchQuery);
      setResults(searchResults);
      saveRecentSearch(searchQuery);
    } catch (error) {
      embraceService.logError('Search failed', {query: searchQuery});
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleProductPress = (product: Product) => {
    // Product view will be tracked on the ProductDetail screen with full details
    navigation.navigate('ProductDetail', {productId: product.id});
  };

  const handleRecentSearchPress = (searchQuery: string) => {
    setQuery(searchQuery);
    handleSearch(searchQuery);
  };

  const renderProduct = ({item, index}: {item: Product; index: number}) => (
    <View style={[styles.productWrapper, index % 2 === 0 && styles.leftProduct]}>
      <ProductCard product={item} onPress={() => handleProductPress(item)} />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#999"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => handleSearch(query)}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Recent Searches */}
      {!hasSearched && recentSearches.length > 0 && (
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((search, index) => (
            <TouchableOpacity
              key={index}
              style={styles.recentItem}
              onPress={() => handleRecentSearchPress(search)}>
              <Text style={styles.recentItemText}>{search}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results */}
      {loading ? (
        <LoadingSpinner message="Searching..." />
      ) : hasSearched && results.length === 0 ? (
        <EmptyState
          title="No Results Found"
          message={`We couldn't find any products matching "${query}"`}
          icon="🔍"
        />
      ) : hasSearched ? (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={styles.resultsContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultsCount}>
              {results.length} results for "{query}"
            </Text>
          }
        />
      ) : (
        <EmptyState
          title="Search Products"
          message="Enter a search term to find products"
          icon="🔍"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  recentContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  clearText: {
    fontSize: 14,
    color: '#007AFF',
  },
  recentItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  recentItemText: {
    fontSize: 14,
    color: '#666',
  },
  resultsContainer: {
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  productWrapper: {
    flex: 1,
    maxWidth: '50%',
  },
  leftProduct: {
    paddingRight: 8,
  },
});
