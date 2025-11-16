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
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RootStackParamList, BottomTabParamList } from '../types';
import SwipeableTab from '../components/SwipeableTab';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'ScanButton'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();

  return (
    <SwipeableTab
      onSwipeLeft={() => navigation.navigate('Search')}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <MaterialCommunityIcons name="leaf" size={72} color="#778873" />
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
          <Ionicons name="camera" size={44} color="#F1F3E0" />
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
          <Ionicons name="camera-outline" size={28} color="#778873" style={styles.featureIcon} />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Scan the Tag</Text>
            <Text style={styles.featureText}>
              Take a photo of any clothing label with your camera
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <MaterialCommunityIcons name="brain" size={28} color="#778873" style={styles.featureIcon} />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>AI Analysis</Text>
            <Text style={styles.featureText}>
              Our AI extracts material and origin, then calculates the eco-impact
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Ionicons name="stats-chart" size={28} color="#778873" style={styles.featureIcon} />
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Get Your Score</Text>
            <Text style={styles.featureText}>
              See the Eco-Score with personalized tips for better choices
            </Text>
          </View>
        </View>
      </View>

      {/* Impact Stats */}
      <View style={styles.impactSection}>
        <Text style={styles.sectionTitle}>What We Consider</Text>
        <View style={styles.impactGridContainer}>
          <View style={styles.impactGrid}>
            <View style={styles.impactCard}>
              <Ionicons name="water" size={40} color="#778873" />
              <Text style={styles.impactLabel}>Water Usage</Text>
            </View>
            <View style={styles.impactCard}>
              <MaterialCommunityIcons name="fire" size={40} color="#778873" />
              <Text style={styles.impactLabel}>Carbon Footprint</Text>
            </View>
            <View style={styles.impactCard}>
              <MaterialCommunityIcons name="waves" size={40} color="#778873" />
              <Text style={styles.impactLabel}>Microplastics</Text>
            </View>
            <View style={styles.impactCard}>
              <Ionicons name="people" size={40} color="#778873" />
              <Text style={styles.impactLabel}>Labor Conditions</Text>
            </View>
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
  hero: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#D2DCB6',
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#778873',
    marginBottom: 8,
    marginTop: 16,
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#778873',
    textAlign: 'center',
    paddingHorizontal: 20,
    opacity: 0.8,
  },
  scanButton: {
    marginHorizontal: 20,
    marginVertical: 20,
    backgroundColor: '#778873',
    borderRadius: 16,
    shadowColor: '#778873',
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
  scanButtonTextContainer: {
    marginLeft: 20,
    flex: 1,
  },
  scanButtonTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F1F3E0',
    marginBottom: 4,
  },
  scanButtonSubtitle: {
    fontSize: 14,
    color: '#F1F3E0',
    opacity: 0.9,
  },
  featuresContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#778873',
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
    backgroundColor: '#A1BC98',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  featureIcon: {
    marginRight: 12,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#778873',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#778873',
    lineHeight: 20,
    opacity: 0.7,
  },
  impactSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  impactGridContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 400,
  },
  impactCard: {
    width: (width - 100) / 2,
    maxWidth: 160,
    backgroundColor: '#F1F3E0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    margin: 8,
  },
  impactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#778873',
    textAlign: 'center',
    marginTop: 8,
  },
  ctaSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  ctaTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#778873',
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaButton: {
    backgroundColor: '#A1BC98',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 60,
    minWidth: 250,
  },
  ctaButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
