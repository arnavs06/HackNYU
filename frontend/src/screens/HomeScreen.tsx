import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>🌿</Text>
        <Text style={styles.heroTitle}>EcoScan</Text>
        <Text style={styles.heroSubtitle}>
          Discover the environmental impact of your clothes
        </Text>
      </View>

      {/* Main Action */}
      <TouchableOpacity
        style={styles.scanButton}
        onPress={() => navigation.navigate('Scanner')}
        activeOpacity={0.8}
      >
        <View style={styles.scanButtonContent}>
          <Text style={styles.scanButtonEmoji}>📸</Text>
          <View style={styles.scanButtonTextContainer}>
            <Text style={styles.scanButtonTitle}>Scan Clothing Tag</Text>
            <Text style={styles.scanButtonSubtitle}>
              Get instant eco-score and analysis
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Features */}
      <View style={styles.featuresContainer}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        
        <View style={styles.featureCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>📸 Scan the Tag</Text>
            <Text style={styles.featureText}>
              Take a photo of any clothing label with your camera
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>🤖 AI Analysis</Text>
            <Text style={styles.featureText}>
              Our AI extracts material and origin, then calculates the eco-impact
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>📊 Get Your Score</Text>
            <Text style={styles.featureText}>
              See the Eco-Score with personalized tips for better choices
            </Text>
          </View>
        </View>
      </View>

      {/* Impact Stats */}
      <View style={styles.impactSection}>
        <Text style={styles.sectionTitle}>What We Consider</Text>
        <View style={styles.impactGrid}>
          <View style={styles.impactCard}>
            <Text style={styles.impactEmoji}>💧</Text>
            <Text style={styles.impactLabel}>Water Usage</Text>
          </View>
          <View style={styles.impactCard}>
            <Text style={styles.impactEmoji}>🔥</Text>
            <Text style={styles.impactLabel}>Carbon Footprint</Text>
          </View>
          <View style={styles.impactCard}>
            <Text style={styles.impactEmoji}>🌊</Text>
            <Text style={styles.impactLabel}>Microplastics</Text>
          </View>
          <View style={styles.impactCard}>
            <Text style={styles.impactEmoji}>👷</Text>
            <Text style={styles.impactLabel}>Labor Conditions</Text>
          </View>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Ready to make sustainable choices?</Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => navigation.navigate('Scanner')}
        >
          <Text style={styles.ctaButtonText}>Start Scanning</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7fafc',
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#667eea',
  },
  heroEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#718096',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  scanButton: {
    margin: 20,
    backgroundColor: '#667eea',
    borderRadius: 16,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
  },
  scanButtonEmoji: {
    fontSize: 40,
  },
  scanButtonTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  scanButtonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  scanButtonSubtitle: {
    fontSize: 14,
    color: '#e6e6ff',
  },
  featuresContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3748',
    marginBottom: 20,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  featureContent: {
    flex: 1,
    marginLeft: 16,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
  },
  impactSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  impactCard: {
    width: (width - 64) / 2,
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    margin: 6,
  },
  impactEmoji: {
    fontSize: 36,
    marginBottom: 8,
  },
  impactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4a5568',
    textAlign: 'center',
  },
  ctaSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2d3748',
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: '#48bb78',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 48,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
