import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {Category} from '../models/Product';

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
}

const {width} = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}>
      <Image
        source={{uri: category.imageUrl}}
        style={styles.image}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <View style={styles.textContainer}>
        <Text style={styles.name}>{category.name}</Text>
        <Text style={styles.count}>{category.productCount} items</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: cardWidth,
    height: 120,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
  },
  image: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  count: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
