import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { COLORS, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import MarketplaceScreen from '../screens/MarketplaceScreen';
import CartScreen from '../screens/CartScreen';
import OrdersScreen from '../screens/OrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FestivalDetailScreen from '../screens/FestivalDetailScreen';
import MyShopScreen from '../screens/MyShopScreen';
import MyProductsScreen from '../screens/MyProductsScreen';
import SellerOrdersScreen from '../screens/SellerOrdersScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return (
    <Text style={{ fontSize: focused ? 22 : 18, opacity: focused ? 1 : 0.6 }}>
      {emoji}
    </Text>
  );
}

function MainTabNavigator() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: t.tabs.home,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🪔" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{
          tabBarLabel: t.tabs.calendar,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="MarketplaceTab"
        component={MarketplaceScreen}
        options={{
          tabBarLabel: t.tabs.marketplace,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="CartTab"
        component={CartScreen}
        options={{
          tabBarLabel: t.tabs.cart,
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛍️" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{
          tabBarLabel: t.tabs.orders,
          tabBarIcon: ({ focused }) => <TabIcon emoji="📦" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          tabBarLabel: t.tabs.profile,
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>🪔</Text>
        <Text style={styles.loadingTitle}>{t.app.name}</Text>
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.surface,
        },
        headerTintColor: COLORS.primary,
        headerTitleStyle: {
          fontWeight: 'bold',
          color: COLORS.textPrimary,
        },
        headerBackTitle: t.common.back,
      }}
    >
      {!isAuthenticated ? (
        // Auth Stack
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        // Main App Stack
        <>
          <Stack.Screen
            name="MainTabs"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="FestivalDetail"
            component={FestivalDetailScreen}
            options={{ title: t.festivals.title }}
          />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{ title: t.cart.title }}
          />
          <Stack.Screen
            name="MyShop"
            component={MyShopScreen}
            options={{ title: t.seller.myShop }}
          />
          <Stack.Screen
            name="MyProducts"
            component={MyProductsScreen}
            options={{ title: t.seller.myProducts }}
          />
          <Stack.Screen
            name="SellerOrders"
            component={SellerOrdersScreen}
            options={{ title: t.seller.incomingOrders }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingLogo: {
    fontSize: 54,
    marginBottom: 8,
  },
  loadingTitle: {
    fontSize: FONT_SIZES.heading,
    fontWeight: '800',
    color: COLORS.primary,
  },
});
