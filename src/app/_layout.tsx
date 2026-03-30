import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Platform, TouchableOpacity, View, Text, StyleSheet, Dimensions } from 'react-native';
import { Home, PlusCircle, PieChart, Users } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';
import { useFinanceStore } from '../store/useFinanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { registerForPushNotifications, storePushToken } from '../services/notificationService';
import { colors, radius, shadow } from '../constants/theme';

const { width: W } = Dimensions.get('window');

const TAB_CONFIG = [
  { name: 'index',  Icon: Home,       label: 'Home'    },
  { name: 'add',    Icon: PlusCircle, label: 'Add'     },
  { name: 'splits', Icon: Users,      label: 'Splits'  },
  { name: 'budget', Icon: PieChart,   label: 'Budget'  },
];

// ─── CUSTOM TAB BAR ────────────────────────────────────────────────────────
function FloatingTabBar({ state, descriptors, navigation }: any) {
  const scaleAnims = useRef(TAB_CONFIG.map(() => new Animated.Value(1))).current;
  const bgAnims   = useRef(TAB_CONFIG.map(() => new Animated.Value(0))).current;

  // Animate on tab focus change
  useEffect(() => {
    TAB_CONFIG.forEach((_, i) => {
      const isFocused = state.index === i;
      Animated.parallel([
        Animated.spring(scaleAnims[i], {
          toValue: isFocused ? 1.1 : 1,
          useNativeDriver: true,
          tension: 180,
          friction: 8,
        }),
        Animated.timing(bgAnims[i], {
          toValue: isFocused ? 1 : 0,
          duration: 180,
          useNativeDriver: false,
        }),
      ]).start();
    });
  }, [state.index]);

  return (
    <View style={tabStyles.wrapper}>
      <View style={tabStyles.pill}>
        {TAB_CONFIG.map((tab, i) => {
          const isFocused = state.index === i;
          const { Icon } = tab;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[i]?.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(tab.name);
            }
          };

          const iconColor = isFocused ? '#fff' : colors.textMuted;

          return (
            <TouchableOpacity
              key={tab.name}
              onPress={onPress}
              activeOpacity={0.7}
              style={tabStyles.tabBtn}
            >
              <Animated.View
                style={[
                  tabStyles.activePill,
                  { transform: [{ scale: scaleAnims[i] }] },
                  isFocused && tabStyles.activePillVisible,
                ]}
              >
                {/* Special styling for Add button */}
                {tab.name === 'add' ? (
                  <View style={tabStyles.addBtn}>
                    <Icon size={22} color="#fff" />
                  </View>
                ) : (
                  <View style={tabStyles.iconWrapper}>
                    <Icon size={20} color={iconColor} />
                    {isFocused && (
                      <Text style={tabStyles.tabLabel}>{tab.label}</Text>
                    )}
                  </View>
                )}
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F1829',
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.6,
    shadowRadius: 32,
    elevation: 20,
    gap: 4,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 52,
  },
  activePill: {
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  activePillVisible: {
    backgroundColor: 'rgba(109, 40, 217, 0.4)',
  },
  iconWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.violet,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.violet,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});

// ─── LAYOUT ────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const initFetch  = useFinanceStore((state) => state.initFetch);
  const { user, initialized, initialize } = useAuthStore();
  const router     = useRouter();
  const segments   = useSegments();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => { initialize(); }, []);

  useEffect(() => {
    if (!initialized) return;
    const inAuthGroup = segments[0] === 'auth';
    if (!user && !inAuthGroup)  router.replace('/auth/login');
    else if (user && inAuthGroup) router.replace('/');
  }, [user, initialized, segments]);

  useEffect(() => {
    if (user) {
      initFetch();
      registerForPushNotifications().then((token) => {
        if (token) storePushToken(user.id, token);
      });
      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
        router.push('/splits');
      });
      return () => { responseListener.current?.remove(); };
    }
  }, [user]);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 28, backgroundColor: 'rgba(109,40,217,0.25)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 36 }}>💸</Text>
        </View>
        <ActivityIndicator size="large" color={colors.violet} />
      </View>
    );
  }

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index"  options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="add"    options={{ title: 'Add' }} />
      <Tabs.Screen name="splits" options={{ title: 'Splits' }} />
      <Tabs.Screen name="budget" options={{ title: 'Budget' }} />
      <Tabs.Screen name="split-detail" options={{ href: null }} />
      <Tabs.Screen name="auth"   options={{ href: null }} />
    </Tabs>
  );
}
