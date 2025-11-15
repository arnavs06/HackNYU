import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabParamList } from '../types';
import SwipeableTab from '../components/SwipeableTab';

type RecommendationsScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Recommendations'>;

interface Recommendation {
  id: string;
  title: string;
  brand: string;
  ecoScore: number;
  material: string;
  price: string;
  description: string;
}

const mockRecommendations: Recommendation[] = [
  {
    id: '1',
    title: 'Organic Cotton T-Shirt',
    brand: 'EcoWear',
    ecoScore: 95,
    material: 'Organic Cotton',
    price: '$28',
    description: 'Soft, breathable, and sustainably made',
  },
  {
    id: '2',
    title: 'Recycled Polyester Jacket',
    brand: 'GreenThread',
    ecoScore: 82,
    material: 'Recycled Polyester',
    price: '$65',
    description: 'Warm, durable, made from ocean plastic',
  },
  {
    id: '3',
    title: 'Hemp Blend Jeans',
    brand: 'NatureDenim',
    ecoScore: 88,
    material: 'Hemp & Organic Cotton',
    price: '$75',
    description: 'Strong, comfortable, low water usage',
  },
  {
    id: '4',
    title: 'Bamboo Fabric Dress',
    brand: 'EarthStyle',
    ecoScore: 90,
    material: 'Bamboo Rayon',
    price: '$52',
    description: 'Silky smooth, naturally antimicrobial',
  },
  {
    id: '5',
    title: 'Linen Button-Up Shirt',
    brand: 'PureThreads',
    ecoScore: 87,
    material: 'European Linen',
    price: '$45',
    description: 'Breathable, elegant, biodegradable',
  },
];

export default function RecommendationsScreen() {
  const navigation = useNavigation<RecommendationsScreenNavigationProp>();

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#A1BC98';
    if (score >= 60) return '#D2DCB6';
    if (score >= 40) return '#d4a574';
    return '#c17a6e';
  };

  return (
    <SwipeableTab
      onSwipeLeft={() => navigation.navigate('History')}
      onSwipeRight={() => navigation.navigate('Search')}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="star" size={40} color="#778873" />
          <Text style={styles.headerTitle}>Eco-Friendly Picks</Text>
          <Text style={styles.headerSubtitle}>
            Sustainable clothing recommendations based on your preferences
          </Text>
        </View>

        {/* Filter Chips */}
        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>Filter by</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            scrollEventThrottle={16}
          >
            <View style={styles.filterChips}>
              <TouchableOpacity style={styles.filterChipActive}>
                <Text style={styles.filterChipTextActive}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>Tops</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>Bottoms</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>Outerwear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>Dresses</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Recommendations List */}
        <View style={styles.recommendationsSection}>
          <Text style={styles.sectionTitle}>
            {mockRecommendations.length} Recommendations
          </Text>
          {mockRecommendations.map((item) => (
            <TouchableOpacity key={item.id} style={styles.card} activeOpacity={0.7}>
              <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                  <View style={styles.imagePlaceholder}>
                    <MaterialCommunityIcons name="tshirt-crew" size={40} color="#A1BC98" />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardBrand}>{item.brand}</Text>
                    <Text style={styles.cardMaterial}>
                      <Ionicons name="leaf" size={14} color="#778873" /> {item.material}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <View
                    style={[
                      styles.scoreBadge,
                      { backgroundColor: getScoreColor(item.ecoScore) },
                    ]}
                  >
                    <Text style={styles.scoreText}>{item.ecoScore}</Text>
                  </View>
                  <Text style={styles.priceText}>{item.price}</Text>
                </View>
              </View>
              <Text style={styles.cardDescription}>{item.description}</Text>
              <TouchableOpacity style={styles.viewButton}>
                <Text style={styles.viewButtonText}>View Details</Text>
                <Ionicons name="arrow-forward" size={16} color="#778873" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </View>

        {/* Why These Recommendations */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>
            <Ionicons name="information-circle" size={20} color="#778873" /> Why these recommendations?
          </Text>
          <Text style={styles.infoText}>
            Based on your scan history and preferences, we've curated sustainable alternatives
            with high eco-scores. These brands prioritize ethical production, eco-friendly
            materials, and transparent supply chains.
          </Text>
        </View>
      </ScrollView>
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
  filterSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#778873',
    marginBottom: 12,
    opacity: 0.7,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 10,
  },
  filterChip: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#D2DCB6',
  },
  filterChipActive: {
    backgroundColor: '#778873',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#778873',
  },
  filterChipText: {
    color: '#778873',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#F1F3E0',
    fontSize: 14,
    fontWeight: '600',
  },
  recommendationsSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#778873',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  imagePlaceholder: {
    width: 70,
    height: 70,
    backgroundColor: '#F1F3E0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#778873',
    marginBottom: 4,
  },
  cardBrand: {
    fontSize: 14,
    color: '#778873',
    opacity: 0.7,
    marginBottom: 4,
  },
  cardMaterial: {
    fontSize: 12,
    color: '#778873',
    opacity: 0.8,
  },
  cardRight: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreBadge: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#778873',
  },
  cardDescription: {
    fontSize: 14,
    color: '#778873',
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F3E0',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#778873',
  },
  infoSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#A1BC98',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#778873',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#778873',
    lineHeight: 20,
    opacity: 0.8,
  },
});

