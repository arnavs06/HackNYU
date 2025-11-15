import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, ScanResult } from '../types';

type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;
type ResultsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Results'>;

export default function ResultsScreen() {
  const route = useRoute<ResultsScreenRouteProp>();
  const navigation = useNavigation<ResultsScreenNavigationProp>();
  const { scanResult } = route.params;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#48bb78';
    if (score >= 60) return '#ecc94b';
    if (score >= 40) return '#ed8936';
    return '#f56565';
  };

  const getGradeEmoji = (grade: string) => {
    const emojis: { [key: string]: string } = {
      A: '🌟',
      B: '✨',
      C: '⚠️',
      D: '😞',
      F: '❌',
    };
    return emojis[grade] || '📊';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#48bb78';
      case 'medium': return '#ed8936';
      case 'high': return '#f56565';
      default: return '#718096';
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `I scanned my clothing with EcoScan! 🌿\n\nEco-Score: ${scanResult.ecoScore.score}/100 (${scanResult.ecoScore.grade})\nMaterial: ${scanResult.material}\nOrigin: ${scanResult.country}\n\nMaking sustainable fashion choices easier!`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleScanAnother = () => {
    navigation.navigate('Scanner');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Score Display */}
      <View style={styles.scoreContainer}>
        <Text style={styles.scoreLabel}>Eco-Score</Text>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreValue, { color: getScoreColor(scanResult.ecoScore.score) }]}>
            {scanResult.ecoScore.score}
          </Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
        <View style={styles.gradeContainer}>
          <Text style={styles.gradeEmoji}>{getGradeEmoji(scanResult.ecoScore.grade)}</Text>
          <Text style={[styles.grade, { color: getScoreColor(scanResult.ecoScore.score) }]}>
            Grade {scanResult.ecoScore.grade}
          </Text>
        </View>
      </View>

      {/* Material & Origin */}
      <View style={styles.detailsContainer}>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Material</Text>
          <Text style={styles.detailValue}>{scanResult.material}</Text>
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Origin</Text>
          <Text style={styles.detailValue}>{scanResult.country}</Text>
        </View>
      </View>

      {/* Impact Flags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Impact Flags</Text>
        <View style={styles.flagsContainer}>
          {scanResult.ecoScore.flags.map((flag, index) => (
            <View
              key={index}
              style={[
                styles.flag,
                { borderColor: getSeverityColor(flag.severity) },
              ]}
            >
              <View
                style={[
                  styles.flagDot,
                  { backgroundColor: getSeverityColor(flag.severity) },
                ]}
              />
              <Text style={styles.flagText}>{flag.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* AI Explanation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💬 AI Analysis</Text>
        <View style={styles.explanationCard}>
          <Text style={styles.explanationText}>{scanResult.explanation}</Text>
          {scanResult.confidence && (
            <Text style={styles.confidenceText}>
              Confidence: {Math.round(scanResult.confidence * 100)}%
            </Text>
          )}
        </View>
      </View>

      {/* Improvement Tips */}
      {scanResult.improvementTips && scanResult.improvementTips.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Tips for Better Choices</Text>
          <View style={styles.tipsContainer}>
            {scanResult.improvementTips.map((tip, index) => (
              <View key={index} style={styles.tip}>
                <Text style={styles.tipBullet}>•</Text>
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareButtonText}>Share Results</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scanButton} onPress={handleScanAnother}>
          <Text style={styles.scanButtonText}>Scan Another Item</Text>
        </TouchableOpacity>
      </View>

      {/* Timestamp */}
      <Text style={styles.timestamp}>
        Scanned on {new Date(scanResult.timestamp).toLocaleString()}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  scoreContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreLabel: {
    fontSize: 18,
    color: '#718096',
    marginBottom: 16,
    fontWeight: '600',
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: '#edf2f7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 18,
    color: '#a0aec0',
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeEmoji: {
    fontSize: 28,
  },
  grade: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  detailsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    marginHorizontal: -6,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 6,
  },
  detailLabel: {
    fontSize: 12,
    color: '#a0aec0',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    color: '#2d3748',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2d3748',
    marginBottom: 12,
  },
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  flag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 4,
  },
  flagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  flagText: {
    fontSize: 13,
    color: '#4a5568',
    fontWeight: '600',
    marginLeft: 6,
  },
  explanationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  explanationText: {
    fontSize: 15,
    color: '#4a5568',
    lineHeight: 22,
  },
  confidenceText: {
    fontSize: 12,
    color: '#a0aec0',
    marginTop: 8,
    fontStyle: 'italic',
  },
  tipsContainer: {
    backgroundColor: '#f0fff4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#9ae6b4',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    color: '#48bb78',
    marginRight: 8,
    fontWeight: 'bold',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#2f855a',
    lineHeight: 20,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#667eea',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#667eea',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  timestamp: {
    textAlign: 'center',
    fontSize: 12,
    color: '#a0aec0',
    fontStyle: 'italic',
  },
});
