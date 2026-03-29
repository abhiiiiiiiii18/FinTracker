import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Home, PlusCircle, PieChart, Users } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { registerForPushNotifications, storePushToken } from '../services/notificationService';

const darkTheme = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#3B82F6',
  accent: '#10B981',
  danger: '#EF4444',
  border: '#334155',
};

export default function TabLayout() {
  const initFetch = useFinanceStore((state) => state.initFetch);
  const { user, initialized, initialize } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Initialize auth state once on app start
  useEffect(() => {
    initialize();
  }, []);

  // Redirect based on auth state
  useEffect(() => {
    if (!initialized) return;

    const inAuthGroup = segments[0] === 'auth';

    if (!user && !inAuthGroup) {
      // Not logged in → go to login
      router.replace('/auth/login');
    } else if (user && inAuthGroup) {
      // Logged in but on auth screen → go to app
      router.replace('/');
    }
  }, [user, initialized, segments]);

  // Fetch user data & register push notifications only when logged in
  useEffect(() => {
    if (user) {
      initFetch();
      // Register push token and store it
      registerForPushNotifications().then((token) => {
        if (token) storePushToken(user.id, token);
      });

      // Handle notification taps (when app is background/closed)
      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
        router.push('/splits');
      });

      return () => {
        if (responseListener.current) responseListener.current.remove();
      };
    }
  }, [user]);

  // Show loading spinner while checking auth
  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: darkTheme.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={darkTheme.primary} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: darkTheme.background,
          borderTopColor: darkTheme.border,
          height: 60,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: darkTheme.primary,
        tabBarInactiveTintColor: darkTheme.textSecondary,
        sceneStyle: { backgroundColor: darkTheme.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, size }) => <PlusCircle size={size + 4} color={color} />,
        }}
      />
      <Tabs.Screen
        name="splits"
        options={{
          title: 'Splits',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, size }) => <PieChart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="split-detail"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="auth"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
