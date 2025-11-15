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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList, ScanResult } from '../types';

type ResultsScreenRouteProp = RouteProp<RootStackParamList, 'Results'>;
type ResultsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Results'>;

export default function ResultsScreen() {
  const route = useRoute<ResultsScreenRouteProp>();
  const navigation = useNavigation<ResultsScreenNavigationProp>();
  const { scanResult } = route.params;

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#A1BC98';
    if (score >= 60) return '#D2DCB6';
    if (score >= 40) return '#d4a574';
    return '#c17a6e';
  };

  const getGradeIcon = (grade: string) => {
    const icons: { [key: string]: string } = {
      A: 'star',
      B: 'star-half',
      C: 'warning',
      D: 'sad',
      F: 'close-circle',
    };
    return icons[grade] || 'stats-chart';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#A1BC98';
      case 'medium': return '#d4a574';
      case 'high': return '#c17a6e';
      default: return '#778873';
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
          <Ionicons 
            name={getGradeIcon(scanResult.ecoScore.grade) as any} 
            size={32} 
            color={getScoreColor(scanResult.ecoScore.score)} 
          />
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
        <View style={styles.sectionTitleContainer}>
          <MaterialCommunityIcons name="brain" size={24} color="#778873" />
          <Text style={styles.sectionTitle}>AI Analysis</Text>
        </View>
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
          <View style={styles.sectionTitleContainer}>
            <Ionicons name="bulb" size={24} color="#778873" />
            <Text style={styles.sectionTitle}>Tips for Better Choices</Text>
          </View>
          <View style={styles.tipsContainer}>
            {scanResult.improvementTips.map((tip, index) => (
              <View key={index} style={styles.tip}>
                <Ionicons name="checkmark-circle" size={20} color="#A1BC98" />
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
    backgroundColor: '#F1F3E0',
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
    color: '#778873',
    marginBottom: 16,
    fontWeight: '600',
  },
  scoreCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    borderColor: '#D2DCB6',
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
    color: '#778873',
    opacity: 0.6,
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    color: '#778873',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  detailValue: {
    fontSize: 16,
    color: '#778873',
    fontWeight: '600',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#778873',
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
    color: '#778873',
    fontWeight: '600',
    marginLeft: 6,
  },
  explanationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#A1BC98',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  explanationText: {
    fontSize: 15,
    color: '#778873',
    lineHeight: 22,
  },
  confidenceText: {
    fontSize: 12,
    color: '#778873',
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  tipsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#D2DCB6',
  },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#778873',
    lineHeight: 20,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  shareButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#A1BC98',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#778873',
    fontSize: 17,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#778873',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  scanButtonText: {
    color: '#F1F3E0',
    fontSize: 17,
    fontWeight: '600',
  },
  timestamp: {
    textAlign: 'center',
    fontSize: 12,
    color: '#778873',
    fontStyle: 'italic',
    opacity: 0.7,
  },
});
