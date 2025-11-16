import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useFocusEffect, useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import SwipeableTab from '../components/SwipeableTab';
import PriceRangeFilter from '../components/PriceRangeFilter';
import { usePriceFilter } from '../hooks/usePriceFilter';
import { storageService } from '../services/storage';
import { BottomTabParamList, RootStackParamList, ScanResult, SimilarProduct } from '../types';

type SearchScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Search'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const formatPriceDisplay = (price?: number | string | null, currency?: string) => {
  if (price === undefined || price === null) {
    return 'Price unavailable';
  }

  if (typeof price === 'number') {
    if (!Number.isFinite(price)) {
      return 'Price unavailable';
    }
    const formatted = price % 1 === 0 ? price.toFixed(0) : price.toFixed(2);
    return `${currency || '$'}${formatted}`;
  }

  const numeric = parseFloat(price.replace(/[^0-9.]/g, ''));
  if (Number.isNaN(numeric)) {
    return price;
  }
  const formatted = numeric % 1 === 0 ? numeric.toFixed(0) : numeric.toFixed(2);
  return `${currency || '$'}${formatted}`;
};

const formatScanTimestamp = (timestamp: string) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch (error) {
    return 'Recent';
  }
};

export default function SearchScreen() {
  const navigation = useNavigation<SearchScreenNavigationProp>();
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadScans = useCallback(async (showSpinner: boolean = true) => {
    try {
      if (showSpinner) {
        setIsLoading(true);
      }
      const scans = (await storageService.getAllScans()).slice(0, 20);
      setRecentScans(scans);
      setSelectedScanId((prev) => {
        if (prev && scans.some((scan) => scan.id === prev)) {
          return prev;
        }
        return scans.length > 0 ? scans[0].id : null;
      });
    } catch (error) {
      console.error('Error loading scans for search:', error);
    } finally {
      if (showSpinner) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadScans();
    }, [loadScans])
  );

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadScans(false);
  }, [loadScans]);

  const selectedScan = useMemo(() => {
    if (!selectedScanId) {
      return null;
    }
    return recentScans.find((scan) => scan.id === selectedScanId) || null;
  }, [recentScans, selectedScanId]);

  const suggestions = useMemo(() => {
    if (!selectedScan?.similarProducts) {
      return [] as SimilarProduct[];
    }
    return selectedScan.similarProducts.slice(0, 20);
  }, [selectedScan]);

  const getSuggestionPrice = useCallback((item: SimilarProduct) => {
    if (item.price === undefined || item.price === null) {
      return null;
    }
    if (typeof item.price === 'number') {
      return Number.isFinite(item.price) ? item.price : null;
    }
    const numeric = parseFloat(item.price.replace(/[^0-9.]/g, ''));
    return Number.isNaN(numeric) ? null : numeric;
  }, []);

  const {
    range: priceRange,
    setMin,
    setMax,
    clearRange,
    filteredItems: filteredSuggestions,
    hasActiveFilter,
  } = usePriceFilter(suggestions, getSuggestionPrice);

  const priceFilterSummary = hasActiveFilter
    ? `Showing items ${priceRange.min ? `≥ $${priceRange.min}` : ''}${
        priceRange.min && priceRange.max ? ' and ' : ''
      }${priceRange.max ? `≤ $${priceRange.max}` : ''}`
    : 'Showing all price points';

  const handleSelectScan = (scanId: string) => {
    setSelectedScanId(scanId);
    clearRange();
  };

  const handleOpenUrl = async (url?: string) => {
    if (!url) {
      return;
    }
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
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

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="shirt-outline" size={80} color="#A1BC98" />
      <Text style={styles.emptyTitle}>Scan a garment to get picks</Text>
      <Text style={styles.emptyText}>
        Search now surfaces up to 20 alternatives tailored to a single scan. Capture your first
        clothing tag to unlock these instant suggestions.
      </Text>
      <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('History')}>
        <Text style={styles.scanButtonText}>View history</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.scanButtonSecondary} onPress={() => navigation.navigate('Scanner')}>
        <Text style={styles.scanButtonSecondaryText}>Scan a tag</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading && recentScans.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#778873" />
        <Text style={styles.loadingText}>Loading your latest scans...</Text>
      </View>
    );
  }

  return (
    <SwipeableTab onSwipeLeft={() => navigation.navigate('Recommendations')}>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#778873']}
              tintColor="#778873"
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Scan-based Search</Text>
            <Text style={styles.headerSubtitle}>
              Pick any recent scan to instantly explore up to 20 sustainable alternatives.
            </Text>
          </View>

          {recentScans.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {selectedScan && (
                <View style={styles.selectedCard}>
                  <View style={styles.selectedHeader}>
                    <View>
                      <Text style={styles.selectedLabel}>Current scan</Text>
                      <Text style={styles.selectedMaterial}>{selectedScan.material}</Text>
                      <Text style={styles.selectedMeta}>{selectedScan.country}</Text>
                    </View>
                    <View
                      style={[styles.scoreBadgeLarge, { backgroundColor: getScoreColor(selectedScan.ecoScore.score) }]}
                    >
                      <Text style={styles.scoreBadgeText}>{selectedScan.ecoScore.score}</Text>
                      <Text style={styles.scoreBadgeSubtext}>/100</Text>
                    </View>
                  </View>
                  <View style={styles.selectedFooter}>
                    <Text style={styles.selectedTimestamp}>
                      Logged {formatScanTimestamp(selectedScan.timestamp)}
                    </Text>
                    <TouchableOpacity
                      style={styles.viewResultButton}
                      onPress={() => {
                        if (selectedScan) {
                          navigation.navigate('Results', { scanResult: selectedScan });
                        }
                      }}
                    >
                      <Ionicons name="scan-circle" size={18} color="#2b6cb0" />
                      <Text style={styles.viewResultButtonText}>View full result</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {recentScans.length > 1 && (
                <View style={styles.recentsSection}>
                  <Text style={styles.sectionTitle}>Switch scan</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentsScroller}>
                    {recentScans.map((scan) => {
                      const isActive = scan.id === selectedScanId;
                      return (
                        <TouchableOpacity
                          key={scan.id}
                          style={[styles.scanChip, isActive && styles.scanChipActive]}
                          onPress={() => handleSelectScan(scan.id)}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.scanChipMaterial, isActive && styles.scanChipMaterialActive]} numberOfLines={1}>
                            {scan.material}
                          </Text>
                          <Text style={[styles.scanChipDate, isActive && styles.scanChipDateActive]}>
                            {formatScanTimestamp(scan.timestamp)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              <View style={styles.resultsHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Sustainable alternatives</Text>
                  <Text style={styles.sectionSubtitle}>
                    Showing {filteredSuggestions.length} of {suggestions.length} saved suggestions
                  </Text>
                </View>
                <MaterialCommunityIcons name="leaf" size={32} color="#778873" />
              </View>

              {suggestions.length > 0 && (
                <PriceRangeFilter
                  minValue={priceRange.min}
                  maxValue={priceRange.max}
                  onMinChange={setMin}
                  onMaxChange={setMax}
                  onClear={clearRange}
                  helperText={priceFilterSummary}
                  isClearVisible={hasActiveFilter}
                />
              )}

              {suggestions.length === 0 ? (
                <View style={styles.emptySuggestions}>
                  <Ionicons name="alert-circle" size={22} color="#778873" />
                  <Text style={styles.emptySuggestionsText}>
                    We could not save alternatives for this scan. Re-scan the garment to regenerate picks.
                  </Text>
                </View>
              ) : filteredSuggestions.length === 0 ? (
                <View style={styles.emptySuggestions}>
                  <Ionicons name="funnel" size={22} color="#778873" />
                  <Text style={styles.emptySuggestionsText}>
                    No matches in that price range. Tweak the min/max filters to explore the full 20 suggestions.
                  </Text>
                </View>
              ) : (
                filteredSuggestions.map((item) => (
                  <View key={item.id} style={styles.suggestionCard}>
                    <View style={styles.suggestionHeader}>
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionTitle}>{item.title}</Text>
                        {item.brand && <Text style={styles.suggestionBrand}>{item.brand}</Text>}
                        <Text style={styles.suggestionMaterial}>{item.material}</Text>
                      </View>
                      <View style={styles.suggestionScore}>
                        <Text style={[styles.suggestionScoreText, { color: getScoreColor(item.ecoScore) }]}>
                          {item.ecoScore}
                        </Text>
                        <Text style={styles.suggestionGrade}>{item.grade}</Text>
                      </View>
                    </View>
                    <Text style={styles.suggestionPrice}>{formatPriceDisplay(item.price, item.currency)}</Text>
                    {!!item.description && <Text style={styles.suggestionDescription}>{item.description}</Text>}
                    {item.url && (
                      <TouchableOpacity style={styles.suggestionLink} onPress={() => handleOpenUrl(item.url)}>
                        <Text style={styles.suggestionLinkText}>View product</Text>
                        <Ionicons name="arrow-forward" size={16} color="#A1BC98" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              )}
            </>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F1F3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#778873',
  },
  selectedCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  selectedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  selectedLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#A1BC98',
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedMaterial: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2d3748',
  },
  selectedMeta: {
    fontSize: 14,
    color: '#4a5568',
    marginTop: 4,
  },
  scoreBadgeLarge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  scoreBadgeSubtext: {
    fontSize: 10,
    color: '#fff',
    opacity: 0.8,
  },
  selectedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedTimestamp: {
    fontSize: 14,
    color: '#4a5568',
  },
  viewResultButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#E8F0F9',
  },
  viewResultButtonText: {
    color: '#2b6cb0',
    fontWeight: '600',
  },
  recentsSection: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  recentsScroller: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#4a5568',
    marginTop: 4,
  },
  scanChip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: 150,
  },
  scanChipActive: {
    borderColor: '#778873',
    backgroundColor: '#E9F5E4',
  },
  scanChipMaterial: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
  },
  scanChipMaterialActive: {
    color: '#2f855a',
  },
  scanChipDate: {
    fontSize: 12,
    color: '#718096',
    marginTop: 6,
  },
  scanChipDateActive: {
    color: '#2f855a',
  },
  resultsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
  },
  suggestionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  suggestionInfo: {
    flex: 1,
    marginRight: 12,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2d3748',
  },
  suggestionBrand: {
    fontSize: 13,
    color: '#4a5568',
    marginTop: 2,
  },
  suggestionMaterial: {
    fontSize: 13,
    color: '#778873',
    marginTop: 6,
  },
  suggestionScore: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  suggestionScoreText: {
    fontSize: 24,
    fontWeight: '700',
  },
  suggestionGrade: {
    fontSize: 13,
    color: '#718096',
  },
  suggestionPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 6,
  },
  suggestionDescription: {
    fontSize: 13,
    color: '#4a5568',
    lineHeight: 18,
    marginBottom: 12,
  },
  suggestionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  suggestionLinkText: {
    color: '#A1BC98',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2d3748',
    marginTop: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#4a5568',
    textAlign: 'center',
    lineHeight: 22,
  },
  emptySuggestions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#F6F8EC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptySuggestionsText: {
    flex: 1,
    color: '#4a5568',
  },
  scanButton: {
    marginTop: 24,
    backgroundColor: '#778873',
    borderRadius: 25,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  scanButtonSecondary: {
    marginTop: 12,
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderWidth: 1,
    borderColor: '#778873',
  },
  scanButtonSecondaryText: {
    color: '#778873',
    fontWeight: '600',
  },
});

