import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useNavigation, CompositeNavigationProp, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomTabParamList, Recommendation, RootStackParamList } from '../types';
import SwipeableTab from '../components/SwipeableTab';
import { apiService } from '../services/api';
import { storageService } from '../services/storage';

type RecommendationsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Recommendations'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function RecommendationsScreen() {
  const navigation = useNavigation<RecommendationsScreenNavigationProp>();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [useDynamicPicks, setUseDynamicPicks] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const hasLoadedPicksRef = useRef(false); // Track if picks have been loaded this session

  // Load personalized picks on screen focus only if scan count changed
  useFocusEffect(
    useCallback(() => {
      checkAndLoadPicks();
    }, [])
  );

  const checkAndLoadPicks = async () => {
    const userId = await storageService.getUserId();
    const scanHistory = await storageService.getScanHistory(20);
    const currentCount = scanHistory.length;
    
    // Get last processed count from storage
    const lastProcessedCount = await storageService.getLastPicksCount();
    
    console.log('📊 Current scan count:', currentCount, '| Last processed:', lastProcessedCount);
    console.log('   Has loaded picks this session:', hasLoadedPicksRef.current);
    
    // Load if: 1) count changed (new scan), OR 2) never loaded in this session and we have enough scans
    const shouldLoad = currentCount !== lastProcessedCount || 
                       (!hasLoadedPicksRef.current && currentCount >= 3);
    
    if (shouldLoad) {
      console.log('🔄 Loading picks - reason:', currentCount !== lastProcessedCount ? 'count changed' : 'initial load');
      setScanCount(currentCount);
      await storageService.setLastPicksCount(currentCount);
      hasLoadedPicksRef.current = true; // Mark as loaded
      loadPersonalizedPicks();
    } else {
      console.log('✓ No new scans, skipping refresh');
      setScanCount(currentCount);
    }
  };

  const loadPersonalizedPicks = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);

      // Get user ID and scan history
      const userId = await storageService.getUserId();
      const scanHistory = await storageService.getScanHistory(20);

      console.log('📚 Loaded scan history:', scanHistory.length, 'items');

      // Need at least 3 scans for meaningful recommendations
      if (scanHistory.length < 3) {
        console.log('⚠️ Not enough scan history, need', 3 - scanHistory.length, 'more scans');
        setRecommendations([]);
        setUseDynamicPicks(false);
        setIsLoading(false);
        return;
      }

      // Select representative scan: prioritize high scores and variety
      // Take from different scans each time by using a weighted rotation
      const recentScans = scanHistory.slice(0, 10); // Last 10 scans
      const highScoringScans = recentScans
        .filter(scan => scan.ecoScore.score >= 60) // Only decent scores
        .sort((a, b) => b.ecoScore.score - a.ecoScore.score);
      
      // Use modulo to rotate through different high-scoring scans
      const rotationIndex = scanHistory.length % Math.max(highScoringScans.length, 1);
      const selectedScan = highScoringScans[rotationIndex] || recentScans[0];

      console.log('🎯 Fetching personalized picks...');
      console.log('   Selected scan:', selectedScan.material, '| Score:', selectedScan.ecoScore.score);
      console.log('   Rotation index:', rotationIndex, 'of', highScoringScans.length, 'high-scoring scans');
      console.log('   Image URI:', selectedScan.imageUri || 'NO IMAGE');

      // Send selected scan's image - backend will use it for similarity search
      // then filter results based on full history analysis
      const response = await apiService.getPersonalizedPicks(
        userId,
        scanHistory,
        selectedScan.imageUri
      );

      console.log('📦 Backend response:', JSON.stringify(response, null, 2));

      if (response.success && response.data.picks) {
        console.log(`🎁 Received ${response.data.picks.length} picks from backend`);
        
        // Transform picks to Recommendation format
        const dynamicPicks: Recommendation[] = response.data.picks.map((pick: any, index: number) => {
          console.log(`  Pick ${index + 1}: ${pick.title} - URL: ${pick.url || 'NO URL'}`);
          return {
            id: pick.id,
            title: pick.title,
            brand: pick.brand || 'Unknown Brand',
            material: pick.material,
            ecoScore: pick.ecoScore,
            description: pick.description,
            price: `${pick.price} USD` || 'Price varies',
            imageUrl: pick.imageUrl,
            category: 'clothing',
            url: pick.url,
          };
        });

        console.log('✅ Loaded', dynamicPicks.length, 'personalized picks from BACKEND API');
        setRecommendations(dynamicPicks);
        setAnalysis(response.data.analysis);
        setUseDynamicPicks(true);
      } else {
        console.log('⚠️ No picks returned');
        setRecommendations([]);
        setUseDynamicPicks(false);
      }
    } catch (error) {
      console.error('Error loading personalized picks:', error);
      // Show empty state on error
      setRecommendations([]);
      setUseDynamicPicks(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    checkAndLoadPicks();
    setIsRefreshing(false);
  };

  const handleOpenUrl = async (url: string | undefined) => {
    if (!url) {
      console.warn('No URL provided');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.warn('Cannot open URL:', url);
      }
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#A1BC98';
    if (score >= 60) return '#D2DCB6';
    if (score >= 40) return '#d4a574';
    return '#c17a6e';
  };

  const handleViewDetails = (item: Recommendation) => {
    const alternatives = recommendations
      .filter((rec) => rec.id !== item.id)
      .sort((a, b) => b.ecoScore - a.ecoScore);

    const betterMatches = alternatives.filter((rec) => rec.ecoScore >= item.ecoScore);
    const fallback = betterMatches.length > 0 ? betterMatches : alternatives;

    navigation.navigate('RecommendationDetail', {
      recommendation: item,
      alternatives: fallback.slice(0, 5),
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#778873" />
        <Text style={styles.loadingText}>Generating your personalized picks...</Text>
        <Text style={styles.loadingSubtext}>Analyzing your scan history</Text>
      </View>
    );
  }

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
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#778873']}
            tintColor="#778873"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="star" size={40} color="#778873" />
          <Text style={styles.headerTitle}>
            {useDynamicPicks ? 'Your Personalized Picks' : 'Eco-Friendly Picks'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {useDynamicPicks
              ? 'Based on your scan history and preferences'
              : 'Sustainable clothing recommendations'}
          </Text>
          {useDynamicPicks && analysis && (
            <View style={styles.analysisChip}>
              <Ionicons name="sparkles" size={16} color="#778873" />
              <Text style={styles.analysisText}>
                Avg Score: {Math.round(analysis.average_eco_score)}
              </Text>
            </View>
          )}
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

        {/* Empty State or Recommendations List */}
        {recommendations.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <MaterialCommunityIcons name="shopping-search" size={80} color="#A1BC98" />
            <Text style={styles.emptyStateTitle}>Start Your Eco Journey!</Text>
            <Text style={styles.emptyStateText}>
              Scan at least 3 items to unlock personalized eco-friendly recommendations based on your preferences.
            </Text>
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {scanCount} / 3 scans completed
              </Text>
              <Text style={styles.progressSubtext}>
                {3 - scanCount} more {3 - scanCount === 1 ? 'scan' : 'scans'} needed
              </Text>
            </View>
            <TouchableOpacity
              style={styles.scanNowButton}
              onPress={() => navigation.navigate('Scanner')}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.scanNowButtonText}>Scan Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.recommendationsSection}>
            <Text style={styles.sectionTitle}>
              {recommendations.length} Recommendations
            </Text>
            {recommendations.map((item) => (
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
                  <View style={styles.priceContainer}>
                    <Ionicons name="pricetag" size={16} color="#778873" />
                    <Text style={styles.priceText}>{item.price}</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.cardDescription}>{item.description}</Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => handleOpenUrl(item.url)}
              >
                <Text style={styles.viewButtonText}>View Product</Text>
                <Ionicons name="open-outline" size={16} color="#778873" />
              </TouchableOpacity>
            </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Why These Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>
            <Ionicons name="information-circle" size={20} color="#778873" /> Why these recommendations?
          </Text>
          <Text style={styles.infoText}>
            {useDynamicPicks ? (
              <>
                Based on your scan history, we've found similar sustainable alternatives that match
                your preferences. {analysis?.style_summary}
                {analysis?.common_materials && analysis.common_materials.length > 0 && (
                  <>\n\nYou frequently scan: {analysis.common_materials.join(', ')}</>
                )}
              </>
            ) : (
              <>
                Start scanning items to get personalized recommendations! These are curated
                sustainable alternatives with high eco-scores. Scan at least 3 items to unlock
                personalized picks based on your preferences.
              </>
            )}
          </Text>
          </View>
        )}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F1F3E0',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#778873',
    marginTop: 16,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#778873',
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
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
  analysisChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  analysisText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#778873',
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
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
    minHeight: 400,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#778873',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#778873',
    opacity: 0.8,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  progressContainer: {
    backgroundColor: '#D2DCB6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
    marginBottom: 24,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#778873',
  },
  progressSubtext: {
    fontSize: 14,
    color: '#778873',
    opacity: 0.7,
    marginTop: 4,
  },
  scanNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#778873',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  scanNowButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

