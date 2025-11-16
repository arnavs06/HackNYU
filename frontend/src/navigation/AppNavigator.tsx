import React from 'react';
import { View, TouchableOpacity, StyleSheet, TouchableOpacityProps } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, BottomTabParamList } from '../types';

// Screens
import ScannerScreen from '../screens/ScannerScreen';
import ResultsScreen from '../screens/ResultsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SearchScreen from '../screens/SearchScreen';
import RecommendationsScreen from '../screens/RecommendationsScreen';
import RecommendationDetailScreen from '../screens/RecommendationDetailScreen';
import AccountScreen from '../screens/AccountScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

// Placeholder component for scan button
const ScanPlaceholder = () => null;

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ navigation }) => ({
        tabBarActiveTintColor: '#778873',
        tabBarInactiveTintColor: '#A1BC98',
        tabBarStyle: {
          backgroundColor: '#F1F3E0',
          borderTopColor: '#D2DCB6',
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Recommendations"
        component={RecommendationsScreen}
        options={{
          title: 'Picks',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="star" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ScanButton"
        component={ScanPlaceholder}
        options={({ navigation }) => ({
          tabBarButton: ({ style, delayLongPress, disabled, ...rest }: BottomTabBarButtonProps) => {
            const normalizedProps = Object.fromEntries(
              Object.entries(rest).map(([key, value]) => [key, value ?? undefined])
            ) as TouchableOpacityProps;

            return (
              <TouchableOpacity
                {...normalizedProps}
                delayLongPress={delayLongPress ?? undefined}
                disabled={disabled ?? undefined}
                style={[style, tabStyles.scanButtonContainer]}
                onPress={() => navigation.navigate('Scanner' as never)}
                activeOpacity={0.8}
              >
                <View style={tabStyles.scanButton}>
                  <Ionicons name="camera" size={30} color="#F1F3E0" />
                </View>
              </TouchableOpacity>
            );
          },
        })}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Account',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const tabStyles = StyleSheet.create({
  scanButtonContainer: {
    top: -30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanButton: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#778873',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#F1F3E0',
    shadowColor: '#778873',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#D2DCB6',
          },
          headerTintColor: '#778873',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="Home"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Scanner"
          component={ScannerScreen}
          options={{
            title: 'Scan Clothing Tag',
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="Results"
          component={ResultsScreen}
          options={{
            title: 'Scan Results',
          }}
        />
        <Stack.Screen
          name="RecommendationDetail"
          component={RecommendationDetailScreen}
          options={{
            title: 'Eco Pick Details',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
