import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, TextInput, Dimensions,
} from 'react-native';
import { useFinanceStore, TransactionCategory } from '../store/useFinanceStore';
import { colors, radius, shadow, CATEGORY_META } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { Target, Edit3, TrendingDown, Award } from 'lucide-react-native';

const { width: W } = Dimensions.get('window');

const CATEGORIES: TransactionCategory[] = ['Food', 'Transport', 'Entertainment', 'Bills', 'Other'];

// ─── CATEGORY BAR ──────────────────────────────────────────────────────────
const CategoryBar = ({
  cat, amount, total, limit,
}: { cat: TransactionCategory; amount: number; total: number; limit: number }) => {
  const meta = CATEGORY_META[cat];
  const pct = total > 0 ? Math.min((amount / total) * 100, 100) : 0;
  const overLimit = limit > 0 && amount > limit;

  return (
    <View style={catStyles.row}>
      <View style={[catStyles.icon, { backgroundColor: meta.bg }]}>
        <Text style={{ fontSize: 16 }}>{meta.emoji}</Text>
      </View>
      <View style={catStyles.info}>
        <View style={catStyles.labelRow}>
          <Text style={catStyles.name}>{meta.label}</Text>
          <Text style={[catStyles.amount, { color: overLimit ? colors.rose : colors.text }]}>
            ₹{amount.toFixed(0)}
            {limit > 0 && <Text style={catStyles.limit}> / ₹{limit}</Text>}
          </Text>
        </View>
        <View style={catStyles.track}>
          <View style={[catStyles.fill, {
            width: `${pct}%` as any,
            backgroundColor: overLimit ? colors.rose : meta.color,
          }]} />
        </View>
        <Text style={catStyles.pct}>{pct.toFixed(0)}% of total</Text>
      </View>
    </View>
  );
};

const catStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  icon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14, marginTop: 2 },
  info: { flex: 1 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  name: { fontSize: 14, fontWeight: '700', color: colors.text },
  amount: { fontSize: 14, fontWeight: '800' },
  limit: { fontSize: 12, color: colors.textMuted, fontWeight: '400' },
  track: { height: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden', marginBottom: 4 },
  fill: { height: '100%', borderRadius: 10 },
  pct: { fontSize: 11, color: colors.textFaint },
});


// ─── MAIN BUDGET SCREEN ────────────────────────────────────────────────────
export default function Budget() {
  const { transactions, budget, updateBudget } = useFinanceStore();
  const [editing, setEditing] = useState(false);
  const [newLimit, setNewLimit] = useState(budget.totalLimit.toString());

  const currentMonthIdx = new Date().getMonth();
  const thisMonthTxs = transactions.filter(t => new Date(t.date).getMonth() === currentMonthIdx);

  const totalSpent = thisMonthTxs.reduce((s, t) => s + (t.type !== 'Credit' ? t.amount : 0), 0);
  const healthPct = Math.max(0, Math.min(100, 100 - (totalSpent / budget.totalLimit) * 100));

  const categoryTotals: Partial<Record<TransactionCategory, number>> = {};
  thisMonthTxs.forEach(t => {
    if (t.type !== 'Credit')
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  // Habit streak: consecutive days with at least one transaction (simple)
  const uniqueDays = new Set(transactions.map(t => new Date(t.date).toDateString())).size;

  const handleSave = () => {
    const val = parseFloat(newLimit);
    if (!isNaN(val) && val > 0) {
      updateBudget({ ...budget, totalLimit: val });
    }
    setEditing(false);
  };

  const healthColor = healthPct > 60 ? colors.mint : healthPct > 30 ? colors.amber : colors.rose;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ───────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.title}>Budget</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {new Date().toLocaleString('default', { month: 'long' })}
            </Text>
          </View>
        </View>

        {/* ── HEALTH CARD ──────────────────────── */}
        <LinearGradient
          colors={['#111827', '#0D1424']}
          style={styles.healthCard}
        >
          <View style={styles.healthTop}>
            <View>
              <Text style={styles.healthLabel}>BUDGET HEALTH</Text>
              <Text style={[styles.healthPct, { color: healthColor }]}>{healthPct.toFixed(0)}%</Text>
              <Text style={styles.healthSub}>
                {healthPct > 60 ? '💎 Excellent control' : healthPct > 30 ? '🔥 Watch your spending' : '🚨 Budget critical'}
              </Text>
            </View>

            {/* Ring */}
            <View style={styles.ringWrapper}>
              <View style={[styles.ringOuter, { borderColor: healthColor + '30' }]}>
                <View style={[styles.ringInner, { borderColor: healthColor, backgroundColor: healthColor + '15' }]}>
                  <Text style={[styles.ringValue, { color: healthColor }]}>{healthPct.toFixed(0)}</Text>
                  <Text style={styles.ringPercent}>%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Budget Limit Editor */}
          <View style={styles.limitRow}>
            <View style={styles.limitLeft}>
              <Target size={14} color={colors.violet} />
              <Text style={styles.limitLabel}>Monthly Limit</Text>
            </View>
            {editing ? (
              <View style={styles.limitEditRow}>
                <Text style={styles.rupee}>₹</Text>
                <TextInput
                  style={styles.limitInput}
                  value={newLimit}
                  onChangeText={setNewLimit}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <TouchableOpacity onPress={handleSave} style={styles.saveChip}>
                  <Text style={styles.saveChipText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.limitDisplay} onPress={() => setEditing(true)}>
                <Text style={styles.limitValue}>₹{budget.totalLimit.toLocaleString()}</Text>
                <Edit3 size={14} color={colors.violet} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* ── QUICK STATS ──────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <TrendingDown size={18} color={colors.rose} style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>₹{totalSpent.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Award size={18} color={colors.amber} style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>{uniqueDays}</Text>
            <Text style={styles.statLabel}>Active Days</Text>
          </View>
          <View style={styles.statCard}>
            <Target size={18} color={colors.mint} style={{ marginBottom: 8 }} />
            <Text style={styles.statValue}>
              ₹{Math.max(0, budget.totalLimit - totalSpent).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Remaining</Text>
          </View>
        </View>

        {/* ── CATEGORY BREAKDOWN ───────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending Breakdown</Text>
          {CATEGORIES.filter(cat => categoryTotals[cat]).length > 0 ? (
            CATEGORIES.filter(cat => categoryTotals[cat]).map(cat => (
              <CategoryBar
                key={cat}
                cat={cat}
                amount={categoryTotals[cat] || 0}
                total={totalSpent}
                limit={budget.categoryLimits[cat] || 0}
              />
            ))
          ) : (
            <View style={styles.emptyBreakdown}>
              <Text style={styles.emptyBreakdownEmoji}>📊</Text>
              <Text style={styles.emptyBreakdownText}>No spending data this month</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingTop: 44, paddingBottom: 110 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  headerBadge: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerBadgeText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },

  healthCard: {
    borderRadius: radius.xl,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.dark,
  },
  healthTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  healthLabel: { fontSize: 11, letterSpacing: 2, color: colors.textMuted, fontWeight: '700', marginBottom: 8 },
  healthPct: { fontSize: 52, fontWeight: '900', letterSpacing: -2 },
  healthSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },

  ringWrapper: { alignItems: 'center', justifyContent: 'center' },
  ringOuter: { width: 90, height: 90, borderRadius: 45, borderWidth: 8, justifyContent: 'center', alignItems: 'center' },
  ringInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  ringValue: { fontSize: 22, fontWeight: '900' },
  ringPercent: { fontSize: 11, color: colors.textMuted, fontWeight: '700' },

  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 14,
    borderRadius: radius.md,
  },
  limitLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  limitDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  limitValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  limitEditRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rupee: { fontSize: 18, color: colors.textMuted, fontWeight: '700' },
  limitInput: {
    fontSize: 18, fontWeight: '800', color: colors.text,
    minWidth: 80, borderBottomWidth: 2, borderBottomColor: colors.violet,
    paddingBottom: 2,
  },
  saveChip: {
    backgroundColor: colors.violet,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  saveChipText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: 16, fontWeight: '900', color: colors.text, marginBottom: 4 },
  statLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },

  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 20, letterSpacing: -0.3 },

  emptyBreakdown: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyBreakdownEmoji: { fontSize: 36, marginBottom: 12 },
  emptyBreakdownText: { fontSize: 14, color: colors.textMuted },
});
