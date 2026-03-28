import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, TextInput } from 'react-native';
import { useFinanceStore, TransactionCategory } from '../store/useFinanceStore';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

const darkTheme = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#3B82F6',
  accent: '#10B981',
  danger: '#EF4444',
  border: '#334155',
  inputBg: '#0B1120',
};

const CATEGORY_COLORS: Record<TransactionCategory, string> = {
  Food: '#F59E0B',
  Transport: '#3B82F6',
  Entertainment: '#8B5CF6',
  Bills: '#EF4444',
  Other: '#10B981',
};

export default function Budget() {
  const { transactions, budget, updateBudget } = useFinanceStore();
  const [newTotalLimit, setNewTotalLimit] = useState(budget.totalLimit.toString());

  const currentMonthIdx = new Date().getMonth();
  const thisMonthTxs = transactions.filter(t => new Date(t.date).getMonth() === currentMonthIdx);

  const categoryTotals: Partial<Record<TransactionCategory, number>> = {};
  thisMonthTxs.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const chartData = Object.keys(categoryTotals).map((cat) => ({
    name: cat,
    amount: categoryTotals[cat as TransactionCategory] || 0,
    color: CATEGORY_COLORS[cat as TransactionCategory],
    legendFontColor: darkTheme.textSecondary,
    legendFontSize: 13,
  }));

  const handleUpdateBudget = () => {
    const limit = parseFloat(newTotalLimit);
    if (!isNaN(limit) && limit > 0) {
      updateBudget({ ...budget, totalLimit: limit });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.header}>
          <Text style={styles.title}>Budget & Habits</Text>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.sectionTitle}>Spending Breakdown</Text>
          {chartData.length > 0 ? (
             <PieChart
               data={chartData}
               width={screenWidth - 80}
               height={200}
               chartConfig={{
                 color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
               }}
               accessor={"amount"}
               backgroundColor={"transparent"}
               paddingLeft={"15"}
               center={[10, 0]}
               absolute
             />
          ) : (
            <Text style={styles.emptyText}>Not enough data to generate charts.</Text>
          )}
        </View>

        <View style={styles.budgetCard}>
          <Text style={styles.sectionTitle}>Monthly Total Limit</Text>
          <View style={styles.budgetRow}>
             <Text style={styles.currency}>₹</Text>
             <TextInput
               style={styles.budgetInput}
               value={newTotalLimit}
               onChangeText={setNewTotalLimit}
               keyboardType="decimal-pad"
               placeholderTextColor={darkTheme.textSecondary}
             />
             <TouchableOpacity style={styles.updateBtn} onPress={handleUpdateBudget}>
               <Text style={styles.updateBtnText}>Save</Text>
             </TouchableOpacity>
          </View>
        </View>

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
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: darkTheme.text,
  },
  chartCard: {
    backgroundColor: darkTheme.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: darkTheme.border,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: darkTheme.text,
    width: '100%',
    marginBottom: 20,
  },
  budgetCard: {
    backgroundColor: darkTheme.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: darkTheme.border,
  },
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currency: {
    fontSize: 24,
    color: darkTheme.textSecondary,
    marginRight: 8,
  },
  budgetInput: {
    flex: 1,
    backgroundColor: darkTheme.inputBg,
    borderRadius: 12,
    padding: 12,
    color: darkTheme.text,
    fontSize: 18,
    borderWidth: 1,
    borderColor: darkTheme.border,
    marginRight: 16,
  },
  updateBtn: {
    backgroundColor: darkTheme.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  updateBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyText: {
    color: darkTheme.textSecondary,
    marginTop: 20,
    marginBottom: 20,
    fontStyle: 'italic',
  }
});
