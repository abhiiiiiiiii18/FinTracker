import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useFinanceStore, Transaction } from '../store/useFinanceStore';
import { ArrowDownRight, TrendingUp, AlertCircle, CheckCircle, BellRing, RefreshCw } from 'lucide-react-native';

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

const TransactionItem = ({ item }: { item: Transaction }) => (
  <View style={styles.txCard}>
    <View style={styles.txLeft}>
      <View style={styles.txIcon}>
        <ArrowDownRight color={darkTheme.text} size={20} />
      </View>
      <View>
        <Text style={styles.txCategory}>{item.category}</Text>
        <Text style={styles.txDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
    </View>
    <Text style={styles.txAmount}>-₹{item.amount.toFixed(2)}</Text>
  </View>
);

export default function Dashboard() {
  const { transactions, budget, getInsights, syncSMS } = useFinanceStore();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const currentMonthIdx = new Date().getMonth();
  const thisMonthTxs = transactions.filter(t => new Date(t.date).getMonth() === currentMonthIdx);
  const totalSpent = thisMonthTxs.reduce((sum, t) => sum + t.amount, 0);
  const progress = Math.min((totalSpent / budget.totalLimit) * 100, 100);
  
  const insights = getInsights();
  const recentTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncSMS();
    setIsSyncing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, Tracker!</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={handleSync} disabled={isSyncing} style={styles.iconBtn}>
              <RefreshCw color={isSyncing ? darkTheme.textSecondary : darkTheme.primary} size={24} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn}>
              <BellRing color={darkTheme.textSecondary} size={24} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Total Spent This Month</Text>
          <Text style={styles.balanceValue}>₹{totalSpent.toFixed(2)}</Text>
          
          <View style={styles.progressContainer}>
             <View style={styles.progressBg}>
               <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progress > 90 ? darkTheme.danger : darkTheme.primary }]} />
             </View>
             <Text style={styles.progressText}>
               ₹{(budget.totalLimit - totalSpent).toFixed(2)} remaining of ₹{budget.totalLimit}
             </Text>
          </View>
        </View>

        {/* AI Habit Insights */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Smart Insights</Text>
          <TrendingUp color={darkTheme.accent} size={20} />
        </View>
        
        {insights.map((insight, idx) => (
           <View key={idx} style={styles.insightCard}>
             {insight.includes('🚨') || insight.includes('⚠️') ? (
               <AlertCircle color={darkTheme.danger} size={24} />
             ) : (
               <CheckCircle color={darkTheme.accent} size={24} />
             )}
             <Text style={styles.insightText}>{insight}</Text>
           </View>
        ))}

        {/* Recent Transactions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
        </View>
        {recentTxs.length > 0 ? (
          recentTxs.map(tx => <TransactionItem key={tx.id} item={tx} />)
        ) : (
          <Text style={styles.emptyText}>No transactions logged yet.</Text>
        )}
        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
    paddingBottom: 100, // accommodate tabs
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: darkTheme.card,
    borderWidth: 1,
    borderColor: darkTheme.border,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: darkTheme.text,
  },
  balanceCard: {
    backgroundColor: darkTheme.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: darkTheme.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: '900',
    color: darkTheme.text,
    marginBottom: 24,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBg: {
    height: 8,
    backgroundColor: darkTheme.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    marginTop: 10,
    fontSize: 13,
    color: darkTheme.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: darkTheme.text,
    marginRight: 8,
  },
  insightCard: {
    backgroundColor: darkTheme.card,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: darkTheme.accent,
  },
  insightText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: darkTheme.text,
    lineHeight: 20,
  },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: darkTheme.card,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: darkTheme.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  txCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.text,
    marginBottom: 4,
  },
  txDate: {
    fontSize: 12,
    color: darkTheme.textSecondary,
  },
  txAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: darkTheme.danger,
  },
  emptyText: {
    color: darkTheme.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    fontStyle: 'italic',
  }
});
