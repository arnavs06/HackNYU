import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabParamList } from '../types';
import SwipeableTab from '../components/SwipeableTab';

type DatabaseScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Database'>;

interface MaterialData {
  id: string;
  name: string;
  category: string;
  ecoScore: number;
  carbonFootprint: string;
  waterUsage: string;
  renewable: boolean;
}

const mockDatabase: MaterialData[] = [
  {
    id: '1',
    name: 'Organic Cotton',
    category: 'Natural',
    ecoScore: 92,
    carbonFootprint: 'Low',
    waterUsage: 'Medium',
    renewable: true,
  },
  {
    id: '2',
    name: 'Recycled Polyester',
    category: 'Synthetic',
    ecoScore: 78,
    carbonFootprint: 'Medium',
    waterUsage: 'Low',
    renewable: false,
  },
  {
    id: '3',
    name: 'Bamboo',
    category: 'Natural',
    ecoScore: 88,
    carbonFootprint: 'Low',
    waterUsage: 'Low',
    renewable: true,
  },
  {
    id: '4',
    name: 'Hemp',
    category: 'Natural',
    ecoScore: 90,
    carbonFootprint: 'Low',
    waterUsage: 'Low',
    renewable: true,
  },
  {
    id: '5',
    name: 'Linen',
    category: 'Natural',
    ecoScore: 85,
    carbonFootprint: 'Low',
    waterUsage: 'Low',
    renewable: true,
  },
  {
    id: '6',
    name: 'Conventional Cotton',
    category: 'Natural',
    ecoScore: 45,
    carbonFootprint: 'Medium',
    waterUsage: 'High',
    renewable: true,
  },
  {
    id: '7',
    name: 'Polyester',
    category: 'Synthetic',
    ecoScore: 35,
    carbonFootprint: 'High',
    waterUsage: 'Medium',
    renewable: false,
  },
  {
    id: '8',
    name: 'Wool',
    category: 'Animal',
    ecoScore: 72,
    carbonFootprint: 'Medium',
    waterUsage: 'Medium',
    renewable: true,
  },
];

export default function DatabaseScreen() {
  const navigation = useNavigation<DatabaseScreenNavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const categories = ['All', 'Natural', 'Synthetic', 'Animal'];

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#A1BC98';
    if (score >= 60) return '#D2DCB6';
    if (score >= 40) return '#d4a574';
    return '#c17a6e';
  };

  const filteredData = selectedCategory === 'All'
    ? mockDatabase
    : mockDatabase.filter(item => item.category === selectedCategory);

  const renderMaterialCard = ({ item }: { item: MaterialData }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <MaterialCommunityIcons name="leaf" size={28} color="#778873" />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardCategory}>{item.category}</Text>
          </View>
          <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(item.ecoScore) }]}>
            <Text style={styles.scoreText}>{item.ecoScore}</Text>
          </View>
        </View>
      </View>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Ionicons name="flame" size={20} color="#778873" />
          <Text style={styles.statLabel}>Carbon</Text>
          <Text style={styles.statValue}>{item.carbonFootprint}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="water" size={20} color="#778873" />
          <Text style={styles.statLabel}>Water</Text>
          <Text style={styles.statValue}>{item.waterUsage}</Text>
        </View>
        <View style={styles.statItem}>
          <MaterialCommunityIcons name="recycle" size={20} color="#778873" />
          <Text style={styles.statLabel}>Renewable</Text>
          <Text style={styles.statValue}>{item.renewable ? 'Yes' : 'No'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SwipeableTab
      onSwipeLeft={() => navigation.navigate('History')}
      onSwipeRight={() => navigation.navigate('Search')}
    >
      <View style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="database" size={40} color="#778873" />
          <Text style={styles.headerTitle}>Material Database</Text>
          <Text style={styles.headerSubtitle}>
            Browse our comprehensive collection of fabric materials and their environmental metrics
          </Text>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{mockDatabase.length}</Text>
            <Text style={styles.statText}>Materials</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{categories.length - 1}</Text>
            <Text style={styles.statText}>Categories</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {Math.round(mockDatabase.reduce((acc, item) => acc + item.ecoScore, 0) / mockDatabase.length)}
            </Text>
            <Text style={styles.statText}>Avg Score</Text>
          </View>
        </View>

        {/* Category Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filter by Category</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            scrollEventThrottle={16}
          >
            <View style={styles.filterChips}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.filterChip,
                    selectedCategory === category && styles.filterChipActive,
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      selectedCategory === category && styles.filterChipTextActive,
                    ]}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Materials List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            {filteredData.length} {filteredData.length === 1 ? 'Material' : 'Materials'}
          </Text>
          <FlatList
            data={filteredData}
            renderItem={renderMaterialCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        </View>
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#778873',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#778873',
    opacity: 0.8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#778873',
    marginBottom: 4,
  },
  statText: {
    fontSize: 12,
    color: '#778873',
    opacity: 0.7,
  },
  filterSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#778873',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 10,
  },
  filterChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: '#D2DCB6',
  },
  filterChipActive: {
    backgroundColor: '#778873',
    borderColor: '#778873',
  },
  filterChipText: {
    color: '#778873',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#F1F3E0',
  },
  listSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#778873',
    marginBottom: 16,
  },
  card: {
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
  cardHeader: {
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#778873',
    marginBottom: 4,
  },
  cardCategory: {
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
  cardStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#D2DCB6',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#778873',
    marginTop: 4,
    opacity: 0.7,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#778873',
    marginTop: 2,
  },
});

