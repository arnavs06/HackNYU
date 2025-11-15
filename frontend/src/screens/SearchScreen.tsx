import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabParamList } from '../types';
import SwipeableTab from '../components/SwipeableTab';

type SearchScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Search'>;

interface SearchResult {
  id: string;
  material: string;
  score: number;
  category: string;
}

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  // Mock search data
  const mockMaterials = [
    { id: '1', material: 'Organic Cotton', score: 92, category: 'Natural' },
    { id: '2', material: 'Recycled Polyester', score: 78, category: 'Synthetic' },
    { id: '3', material: 'Bamboo', score: 88, category: 'Natural' },
    { id: '4', material: 'Hemp', score: 90, category: 'Natural' },
    { id: '5', material: 'Linen', score: 85, category: 'Natural' },
    { id: '6', material: 'Conventional Cotton', score: 45, category: 'Natural' },
    { id: '7', material: 'Polyester', score: 35, category: 'Synthetic' },
    { id: '8', material: 'Wool', score: 72, category: 'Animal' },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
      return;
    }
    
    const filtered = mockMaterials.filter(item =>
      item.material.toLowerCase().includes(query.toLowerCase())
    );
    setSearchResults(filtered);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#A1BC98';
    if (score >= 60) return '#D2DCB6';
    if (score >= 40) return '#d4a574';
    return '#c17a6e';
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.resultCard} activeOpacity={0.7}>
      <View style={styles.resultContent}>
        <MaterialCommunityIcons name="leaf" size={32} color="#778873" />
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle}>{item.material}</Text>
          <Text style={styles.resultCategory}>{item.category}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.score) }]}>
          <Text style={styles.scoreText}>{item.score}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="search" size={80} color="#A1BC98" />
      <Text style={styles.emptyTitle}>Search for Materials</Text>
      <Text style={styles.emptyText}>
        Find eco-scores for different fabric materials and their environmental impact
      </Text>
    </View>
  );

  const renderNoResults = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={80} color="#A1BC98" />
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
          <Ionicons name="search" size={20} color="#778873" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for materials..."
            placeholderTextColor="#A1BC98"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#778873" />
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
            <FlatList
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
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
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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

