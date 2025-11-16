import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import PriceRangeFilter from '../components/PriceRangeFilter';
import { usePriceFilter } from '../hooks/usePriceFilter';
import { RootStackParamList, Recommendation } from '../types';

const useScoreColor = (score: number) => {
  if (score >= 80) return '#A1BC98';
  if (score >= 60) return '#D2DCB6';
  if (score >= 40) return '#d4a574';
  return '#c17a6e';
};

type RecommendationDetailRoute = RouteProp<RootStackParamList, 'RecommendationDetail'>;
type RecommendationDetailNavigation = NativeStackNavigationProp<RootStackParamList>;

export default function RecommendationDetailScreen() {
  const route = useRoute<RecommendationDetailRoute>();
  const navigation = useNavigation<RecommendationDetailNavigation>();
  const { recommendation, alternatives } = route.params;

  const betterAlternatives = alternatives.filter(
    (alt) => alt.ecoScore >= recommendation.ecoScore && alt.id !== recommendation.id,
  );
  const fallbackAlternatives = betterAlternatives.length ? betterAlternatives : alternatives;

  const {
    range: priceRange,
    setMin,
    setMax,
    clearRange,
    filteredItems: priceFilteredAlternatives,
    hasActiveFilter,
  } = usePriceFilter(fallbackAlternatives, (item) => {
    if (!item.price) {
      return null;
    }
    const numeric = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    return Number.isFinite(numeric) ? numeric : null;
  });

  const priceFilterSummary = hasActiveFilter
    ? `Showing items ${priceRange.min ? `≥ $${priceRange.min}` : ''}${
        priceRange.min && priceRange.max ? ' and ' : ''
      }${priceRange.max ? `≤ $${priceRange.max}` : ''}`
    : 'Showing all price points';

  const handleOpenUrl = async (url?: string) => {
    if (!url) {
      Alert.alert('No Link', 'This item doesn\'t have a product link yet.');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Error', 'Failed to open the product link');
    }
  };

  const renderAlternative = (item: Recommendation) => (
    <TouchableOpacity 
      key={item.id} 
      style={styles.altCard}
      onPress={() => handleOpenUrl(item.url)}
      activeOpacity={0.7}
    >
      <View style={styles.altHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.altTitle}>{item.title}</Text>
          <Text style={styles.altBrand}>{item.brand}</Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: useScoreColor(item.ecoScore) }]}>
          <Text style={styles.scoreText}>{item.ecoScore}</Text>
        </View>
      </View>
      <Text style={styles.altMaterial}>
        <Ionicons name="leaf" size={14} color="#778873" /> {item.material}
      </Text>
      <Text style={styles.altDescription}>{item.description}</Text>
      <View style={styles.altFooter}>
        <Text style={styles.priceText}>{item.price}</Text>
        <View style={styles.linkIndicator}>
          <Ionicons name="open-outline" size={16} color="#2b6cb0" />
          <Text style={styles.linkText}>View Product</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Current Pick</Text>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>{recommendation.title}</Text>
            <Text style={styles.brand}>{recommendation.brand}</Text>
          </View>
          <View
            style={[styles.scoreBadge, { backgroundColor: useScoreColor(recommendation.ecoScore) }]}
          >
            <Text style={styles.scoreText}>{recommendation.ecoScore}</Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            <Ionicons name="leaf" size={14} color="#778873" /> {recommendation.material}
          </Text>
          <Text style={styles.metaText}>
            <MaterialCommunityIcons name="cash-multiple" size={16} color="#778873" />{' '}
            {recommendation.price}
          </Text>
        </View>
        <Text style={styles.description}>{recommendation.description}</Text>
        
        {recommendation.url && (
          <TouchableOpacity 
            style={styles.viewProductButton}
            onPress={() => handleOpenUrl(recommendation.url)}
          >
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={styles.viewProductButtonText}>View Product Page</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.altSection}>
        <View style={styles.altHeaderRow}>
          <Ionicons name="sparkles" size={22} color="#2b6cb0" />
          <Text style={styles.altSectionTitle}>Better Eco-Friendly Alternatives</Text>
        </View>
        {fallbackAlternatives.length === 0 ? (
          <Text style={styles.emptyStateText}>
            This pick already tops our eco list. Check back later for more sustainable drops!
          </Text>
        ) : (
          <>
            <PriceRangeFilter
              containerStyle={styles.altFilter}
              minValue={priceRange.min}
              maxValue={priceRange.max}
              onMinChange={setMin}
              onMaxChange={setMax}
              onClear={clearRange}
              helperText={priceFilterSummary}
              isClearVisible={hasActiveFilter}
            />
            {priceFilteredAlternatives.length === 0 ? (
              <Text style={styles.emptyStateText}>
                No alternatives in that range. Adjust or clear the filter to see more picks.
              </Text>
            ) : (
              priceFilteredAlternatives.slice(0, 3).map(renderAlternative)
            )}
          </>
        )}
      </View>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={18} color="#F1F3E0" />
        <Text style={styles.backButtonText}>Back to Eco Picks</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F3E0',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#A1BC98',
    fontWeight: '700',
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
  },
  brand: {
    fontSize: 14,
    color: '#718096',
    marginTop: 4,
  },
  scoreBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaText: {
    fontSize: 14,
    color: '#4a5568',
  },
  description: {
    fontSize: 15,
    color: '#4a5568',
    lineHeight: 22,
  },
  altSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2b6cb0',
  },
  altFilter: {
    marginHorizontal: 0,
    marginTop: 0,
  },
  altHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  altSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2b6cb0',
  },
  altCard: {
    backgroundColor: '#F1F3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  altHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  altTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  altBrand: {
    fontSize: 13,
    color: '#4a5568',
  },
  altMaterial: {
    fontSize: 13,
    color: '#4a5568',
    marginBottom: 4,
  },
  altDescription: {
    fontSize: 13,
    color: '#4a5568',
    lineHeight: 20,
    marginBottom: 12,
  },
  altFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
  },
  linkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkText: {
    color: '#2b6cb0',
    fontWeight: '600',
    fontSize: 13,
  },
  viewProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2b6cb0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
    gap: 8,
  },
  viewProductButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#4a5568',
    lineHeight: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#778873',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 10,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#F1F3E0',
  },
});
