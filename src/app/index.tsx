import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, Animated, Dimensions,
} from 'react-native';
import { useFinanceStore, Transaction } from '../store/useFinanceStore';
import { useAuthStore } from '../store/useAuthStore';
import { RefreshCw, LogOut, Zap, TrendingUp, ArrowUpRight, Waves, Bell } from 'lucide-react-native';
import { colors, radius, shadow, CATEGORY_META } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { width: W } = Dimensions.get('window');

// ─── TRANSACTION ITEM ──────────────────────────────────────────────────────
const TransactionItem = ({ item, onDelete }: { item: Transaction; onDelete: (id: string) => void }) => {
  const meta = CATEGORY_META[item.category] || CATEGORY_META['Other'];
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80 }).start();
  }, []);

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, tension: 200 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 200 }),
    ]).start();
  };

  const time = new Date(item.date);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = time.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        onLongPress={() => {
          Alert.alert('Delete Transaction', 'Remove this transaction?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(item.id) },
          ]);
        }}
        style={styles.txCard}
      >
        {/* Category Icon */}
        <View style={[styles.txIconWrapper, { backgroundColor: meta.bg }]}>
          <Text style={styles.txEmoji}>{meta.emoji}</Text>
        </View>

        {/* Details */}
        <View style={styles.txInfo}>
          <Text style={styles.txCategory}>{item.merchant || item.category}</Text>
          <View style={styles.txMeta}>
            <Text style={styles.txDate}>{dateStr} · {timeStr}</Text>
            {item.source === 'sms' && (
              <View style={styles.smsBadge}>
                <Text style={styles.smsBadgeText}>SMS</Text>
              </View>
            )}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.txAmountWrapper}>
          <Text style={[styles.txAmount, { color: item.type === 'Credit' ? colors.mint : colors.rose }]}>
            {item.type === 'Credit' ? '+' : '-'}₹{item.amount.toFixed(0)}
          </Text>
          <View style={[styles.txDot, { backgroundColor: meta.color }]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── STAT CHIP ─────────────────────────────────────────────────────────────
const StatChip = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <View style={[styles.statChip, { borderColor: color + '30' }]}>
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// ─── MAIN DASHBOARD ────────────────────────────────────────────────────────
export default function Dashboard() {
  const { transactions, budget, getInsights, syncSMS, removeTransaction } = useFinanceStore();
  const { user, signOut } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const heroAnim = useRef(new Animated.Value(0)).current;

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  useEffect(() => {
    Animated.spring(heroAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }).start();
  }, []);

  const currentMonthIdx = new Date().getMonth();
  const thisMonthTxs = transactions.filter(t => new Date(t.date).getMonth() === currentMonthIdx);
  const totalSpent = thisMonthTxs.reduce((sum, t) => sum + (t.type !== 'Credit' ? t.amount : 0), 0);
  const progress = Math.min((totalSpent / budget.totalLimit) * 100, 100);
  const remaining = budget.totalLimit - totalSpent;
  const isOverBudget = totalSpent > budget.totalLimit;

  const weeklyTxs = transactions.filter(t => {
    const d = new Date(t.date);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 24 * 60 * 60 * 1000;
  });
  const weeklySpent = weeklyTxs.reduce((s, t) => s + (t.type !== 'Credit' ? t.amount : 0), 0);
  const largestTx = thisMonthTxs.length > 0 ? Math.max(...thisMonthTxs.map(t => t.amount)) : 0;

  const insights = getInsights();
  const recentTxs = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const handleSync = async () => {
    setIsSyncing(true);
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 800, useNativeDriver: true })
    ).start();
    await syncSMS();
    setIsSyncing(false);
    spinAnim.stopAnimation();
    spinAnim.setValue(0);
  };

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const progressColor = isOverBudget ? colors.rose : progress > 80 ? colors.amber : colors.mint;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ─────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {firstName} 👋</Text>
            <Text style={styles.subtitle}>Here's your financial pulse</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleSync} disabled={isSyncing} style={styles.iconBtn}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <RefreshCw color={isSyncing ? colors.textMuted : colors.violet} size={20} />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={handleLogout}>
              <LogOut color={colors.rose} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── HERO CARD ──────────────────────────── */}
        <Animated.View style={{
          opacity: heroAnim,
          transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }}>
          <LinearGradient
            colors={['#1E0E4A', '#2D1B6E', '#160B38']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {/* Decorative orb */}
            <View style={styles.heroOrb} />
            <View style={styles.heroOrb2} />

            <View style={styles.heroTop}>
              <View>
                <Text style={styles.heroLabel}>SPENT THIS MONTH</Text>
                <Text style={styles.heroAmount}>₹{totalSpent.toFixed(0)}</Text>
              </View>
              <View style={styles.heroBudgetChip}>
                <Zap size={12} color={colors.violet} />
                <Text style={styles.heroBudgetChipText}>of ₹{budget.totalLimit.toLocaleString()}</Text>
              </View>
            </View>

            {/* Progress track */}
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, {
                width: `${progress}%` as any,
                backgroundColor: progressColor,
                shadowColor: progressColor,
              }]} />
            </View>
            <Text style={styles.remainingText}>
              {isOverBudget
                ? `🚨 Over by ₹${Math.abs(remaining).toFixed(0)}`
                : `₹${remaining.toFixed(0)} left to spend`}
            </Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <StatChip label="This Week" value={`₹${weeklySpent.toFixed(0)}`} color={colors.sky} />
              <View style={styles.statDivider} />
              <StatChip label="Transactions" value={`${thisMonthTxs.length}`} color={colors.violet} />
              <View style={styles.statDivider} />
              <StatChip label="Largest" value={`₹${largestTx.toFixed(0)}`} color={colors.amber} />
            </View>
          </LinearGradient>
        </Animated.View>

        {/* ── INSIGHTS ───────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <TrendingUp size={16} color={colors.violet} />
            <Text style={styles.sectionTitle}>Smart Insights</Text>
          </View>
          {insights.map((insight, i) => {
            const isAlert = insight.includes('🚨') || insight.includes('⚠️');
            const accentColor = isAlert ? colors.rose : colors.mint;
            return (
              <View key={i} style={[styles.insightCard, { borderLeftColor: accentColor }]}>
                <View style={[styles.insightPulse, { backgroundColor: accentColor + '20' }]}>
                  <Text style={{ fontSize: 18 }}>{insight.slice(0, 2)}</Text>
                </View>
                <Text style={styles.insightText}>{insight.slice(2).trim()}</Text>
              </View>
            );
          })}
        </View>

        {/* ── RECENT TRANSACTIONS ────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Waves size={16} color={colors.violet} />
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </View>

          {recentTxs.length > 0 ? (
            recentTxs.map(tx => (
              <TransactionItem key={tx.id} item={tx} onDelete={removeTransaction} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💸</Text>
              <Text style={styles.emptyTitle}>No transactions yet</Text>
              <Text style={styles.emptySubtitle}>Tap + to add your first expense</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: 20,
    paddingTop: 44,
    paddingBottom: 110,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },

  // ── Hero Card
  heroCard: {
    borderRadius: radius.xl,
    padding: 24,
    marginBottom: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderBright,
    ...shadow.dark,
  },
  heroOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    top: -60,
    right: -60,
  },
  heroOrb2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    bottom: -30,
    left: 40,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  heroLabel: {
    fontSize: 11,
    letterSpacing: 2,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
  },
  heroAmount: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1.5,
  },
  heroBudgetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderBright,
    marginTop: 6,
  },
  heroBudgetChipText: {
    fontSize: 12,
    color: colors.violet,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.pill,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  remainingText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 20,
  },

  // ── Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  statChip: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.sm,
    padding: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.borderSubtle,
  },

  // ── Section
  section: {
    marginBottom: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3,
  },

  // ── Insight Cards
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  insightPulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 19,
  },

  // ── Transaction Card
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadow.card,
  },
  txIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  txEmoji: {
    fontSize: 22,
  },
  txInfo: {
    flex: 1,
  },
  txCategory: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  txMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  txDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  smsBadge: {
    backgroundColor: 'rgba(14, 165, 233, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.3)',
  },
  smsBadgeText: {
    fontSize: 9,
    color: colors.sky,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  txAmountWrapper: {
    alignItems: 'flex-end',
    gap: 6,
  },
  txAmount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  txDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ── Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 36,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
