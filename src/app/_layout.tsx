import { Tabs } from 'expo-router';
import React, { useEffect } from 'react';
import { Home, PlusCircle, PieChart } from 'lucide-react-native';
import { useFinanceStore } from '../store/useFinanceStore';

const darkTheme = {
  background: '#0F172A', // slate-900
  card: '#1E293B', // slate-800
  text: '#F8FAFC', // slate-50
  textSecondary: '#94A3B8', // slate-400
  primary: '#3B82F6', // blue-500
  accent: '#10B981', // emerald-500
  danger: '#EF4444', // red-500
  border: '#334155', // slate-700
};

export default function TabLayout() {
  const initFetch = useFinanceStore((state) => state.initFetch);

  useEffect(() => {
    initFetch();
  }, [initFetch]);

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
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, size }) => <PieChart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide from tabs
        }}
      />
    </Tabs>
  );
}
