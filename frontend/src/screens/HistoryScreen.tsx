import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ScanResult, HistoryStats } from '../types';
import { mockApiService } from '../services/mockApi';

type HistoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'History'>;

export default function HistoryScreen() {
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigation = useNavigation<HistoryScreenNavigationProp>();

  const loadHistory = async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      
      // Using mock API - replace with real apiService when backend is ready
      const [historyData, statsData] = await Promise.all([
        mockApiService.getScanHistory('user_123', 50),
        mockApiService.getUserStats('user_123'),
      ]);

      setScans(historyData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadHistory(false);
  };

  const handleScanPress = (scan: ScanResult) => {
    navigation.navigate('Results', { scanResult: scan });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ecc94b';
    if (score >= 40) return '#ed8936';
    return '#f56565';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderScanItem = ({ item }: { item: ScanResult }) => (
    <TouchableOpacity
      style={styles.scanCard}
      onPress={() => handleScanPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.scanHeader}>
        <View
          style={[
            styles.scoreCircle,
            { backgroundColor: getScoreColor(item.ecoScore.score) + '20' },
          ]}
        >
          <Text style={[styles.scoreText, { color: getScoreColor(item.ecoScore.score) }]}>
            {item.ecoScore.score}
          </Text>
        </View>
        <View style={styles.scanInfo}>
          <Text style={styles.material} numberOfLines={1}>
            {item.material}
          </Text>
          <Text style={styles.country}>{item.country}</Text>
        </View>
        <View style={styles.gradeContainer}>
          <Text style={[styles.gradeBadge, { color: getScoreColor(item.ecoScore.score) }]}>
            {item.ecoScore.grade}
          </Text>
        </View>
      </View>
      <View style={styles.scanFooter}>
        <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
        <Text style={styles.flagsCount}>
          {item.ecoScore.flags.length} {item.ecoScore.flags.length === 1 ? 'flag' : 'flags'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📸</Text>
      <Text style={styles.emptyTitle}>No scans yet</Text>
      <Text style={styles.emptyText}>
        Start scanning clothing tags to build your eco-wardrobe history
      </Text>
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('Scanner')}
      >
        <Text style={styles.scanButtonText}>Scan Your First Item</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStats = () => {
    if (!stats || stats.totalScans === 0) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Your Impact Summary</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.totalScans}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                { color: getScoreColor(stats.averageScore) },
              ]}
            >
              {stats.averageScore}
            </Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <View style={styles.statCard}>
            <Text
              style={[
                styles.statValue,
                { color: stats.improvementTrend >= 0 ? '#48bb78' : '#f56565' },
              ]}
            >
              {stats.improvementTrend >= 0 ? '+' : ''}
              {stats.improvementTrend}%
            </Text>
            <Text style={styles.statLabel}>Improvement</Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading your history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={scans}
        keyExtractor={(item) => item.id}
        renderItem={renderScanItem}
        ListHeaderComponent={renderStats}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={[
          styles.listContent,
          scans.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#667eea"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
  },
  listContent: {
    padding: 20,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    marginHorizontal: -6,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
  },
  scanCard: {
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
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scanInfo: {
    flex: 1,
  },
  material: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  country: {
    fontSize: 14,
    color: '#718096',
  },
  gradeContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f7fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeBadge: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scanFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  timestamp: {
    fontSize: 12,
    color: '#a0aec0',
  },
  flagsCount: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  scanButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
