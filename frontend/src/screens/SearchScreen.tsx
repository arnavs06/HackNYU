import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
// import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabParamList, ProductMetadata } from '../types';
import { supabaseService } from '../services/supabaseService';
import SwipeableTab from '../components/SwipeableTab';

type SearchScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Search'>;

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load initial products
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const products = await supabaseService.getAllProducts(50);
      setSearchResults(products);
      console.log(`✅ Loaded ${products.length} products from database`);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setIsLoading(true);
    
    try {
      const results = await supabaseService.searchProducts(query);
      setSearchResults(results);
      console.log(`✅ Found ${results.length} products`);
    } catch (error) {
      console.error('Error searching products:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#A1BC98';
    if (score >= 60) return '#D2DCB6';
    if (score >= 40) return '#d4a574';
    return '#c17a6e';
  };

  const renderSearchResult = ({ item }: { item: ProductMetadata }) => (
    <TouchableOpacity style={styles.resultCard} activeOpacity={0.7}>
      <View style={styles.resultContent}>
        <Text style={styles.resultEmoji}>👕</Text>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle}>{item.materials}</Text>
          <Text style={styles.resultCategory}>{item.origin}</Text>
          {item.brand && <Text style={styles.resultBrand}>{item.brand}</Text>}
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.ecoScore.score) }]}>
          <Text style={styles.scoreText}>{item.ecoScore.score}</Text>
          <Text style={styles.gradeText}>{item.ecoScore.grade}</Text>
        </View>
      </View>
      {item.scanCount && item.scanCount > 1 && (
        <Text style={styles.scanCount}>Scanned {item.scanCount} times</Text>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 80 }}>🔍</Text>
      <Text style={styles.emptyTitle}>Search for Materials</Text>
      <Text style={styles.emptyText}>
        Find eco-scores for different fabric materials and their environmental impact
      </Text>
    </View>
  );

  const renderNoResults = () => (
    <View style={styles.emptyContainer}>
      <Text style={{ fontSize: 80 }}>❌</Text>
      <Text style={styles.emptyTitle}>No Results Found</Text>
      <Text style={styles.emptyText}>
        Try searching for a different material like "cotton" or "polyester"
      </Text>
    </View>
  );

  return (
    <SwipeableTab
      onSwipeLeft={() => navigation.navigate('Recommendations')}
    >
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
        {/* Search Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Material Search</Text>
          <Text style={styles.headerSubtitle}>
            Discover the environmental impact of different fabrics
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔎</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for materials..."
            placeholderTextColor="#A1BC98"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Text style={{ fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Popular Searches */}
        {searchQuery === '' && (
          <View style={styles.popularSection}>
            <Text style={styles.sectionTitle}>Popular Materials</Text>
            <View style={styles.chipContainer}>
              {['Cotton', 'Polyester', 'Wool', 'Bamboo', 'Hemp', 'Linen'].map((material) => (
                <TouchableOpacity
                  key={material}
                  style={styles.chip}
                  onPress={() => handleSearch(material)}
                >
                  <Text style={styles.chipText}>{material}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Search Results */}
        {searchQuery === '' ? (
          renderEmptyState()
        ) : searchResults.length > 0 ? (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>
              {searchResults.length} {searchResults.length === 1 ? 'Result' : 'Results'}
            </Text>
            {isLoading ? (
              <ActivityIndicator size="large" color="#778873" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id || `${item.materials}-${item.origin}`}
                scrollEnabled={false}
              />
            )}
          </View>
        ) : (
          renderNoResults()
        )}
      </ScrollView>
    </View>
    </SwipeableTab>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F3E0',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    backgroundColor: '#D2DCB6',
    padding: 24,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#778873',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#778873',
    opacity: 0.8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#778873',
  },
  popularSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#778873',
    marginBottom: 16,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#D2DCB6',
  },
  chipText: {
    color: '#778873',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsSection: {
    paddingHorizontal: 20,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    marginLeft: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#778873',
    marginBottom: 4,
  },
  resultCategory: {
    fontSize: 14,
    color: '#778873',
    opacity: 0.7,
  },
  scoreBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  resultEmoji: {
    fontSize: 32,
  },
  resultBrand: {
    fontSize: 12,
    color: '#778873',
    opacity: 0.6,
    marginTop: 2,
  },
  scanCount: {
    fontSize: 12,
    color: '#778873',
    opacity: 0.6,
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#778873',
    marginTop: 16,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#778873',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
});

