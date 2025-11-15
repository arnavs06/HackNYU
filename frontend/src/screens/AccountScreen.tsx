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

type AccountScreenNavigationProp = BottomTabNavigationProp<BottomTabParamList, 'Account'>;

export default function AccountScreen() {
  const navigation = useNavigation<AccountScreenNavigationProp>();

  return (
    <SwipeableTab
      onSwipeRight={() => navigation.navigate('History')}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        decelerationRate="fast"
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={50} color="#778873" />
          </View>
          <Text style={styles.userName}>Eco Warrior</Text>
          <Text style={styles.userEmail}>ecowarrior@example.com</Text>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={18} color="#778873" />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="scan" size={32} color="#778873" />
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="leaf" size={32} color="#A1BC98" />
            <Text style={styles.statNumber}>78</Text>
            <Text style={styles.statLabel}>Avg Score</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="trophy" size={32} color="#778873" />
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Achievements</Text>
          </View>
        </View>

        {/* Settings Menu */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={24} color="#778873" />
              <Text style={styles.menuItemText}>Personal Information</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={24} color="#778873" />
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#778873" />
              <Text style={styles.menuItemText}>Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <MaterialCommunityIcons name="earth" size={24} color="#778873" />
              <Text style={styles.menuItemText}>Sustainability Goals</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="bookmark-outline" size={24} color="#778873" />
              <Text style={styles.menuItemText}>Saved Items</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="heart-outline" size={24} color="#778873" />
              <Text style={styles.menuItemText}>Favorite Brands</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="color-palette-outline" size={24} color="#778873" />
              <Text style={styles.menuItemText}>Appearance</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>
        </View>

        {/* Support */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={24} color="#778873" />
              <Text style={styles.menuItemText}>Help Center</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="mail-outline" size={24} color="#778873" />
              <Text style={styles.menuItemText}>Contact Us</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="document-text-outline" size={24} color="#778873" />
              <Text style={styles.menuItemText}>Terms & Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={24} color="#778873" />
              <Text style={styles.menuItemText}>About EcoScan</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#A1BC98" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color="#c17a6e" />
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>EcoScan v1.0.0</Text>
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
    padding: 32,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F1F3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#778873',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#778873',
    opacity: 0.7,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 6,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#778873',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#778873',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#778873',
    opacity: 0.7,
    textAlign: 'center',
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#778873',
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuItemText: {
    fontSize: 16,
    color: '#778873',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c17a6e',
    gap: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c17a6e',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#778873',
    opacity: 0.5,
    marginTop: 24,
  },
});

