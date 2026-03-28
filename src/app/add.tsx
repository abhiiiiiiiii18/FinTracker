import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useFinanceStore, TransactionCategory } from '../store/useFinanceStore';
import { useRouter } from 'expo-router';
import { X } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';

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

const CATEGORIES: TransactionCategory[] = ['Food', 'Transport', 'Entertainment', 'Bills', 'Other'];

export default function AddTransaction() {
  const router = useRouter();
  const { addTransaction, budget, transactions } = useFinanceStore();
  
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Food');
  const [note, setNote] = useState('');

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid number.');
      return;
    }

    const value = parseFloat(amount);
    
    // Quick Overspend Check Notification
    const currentMonthIdx = new Date().getMonth();
    const thisMonthTxs = transactions.filter(t => new Date(t.date).getMonth() === currentMonthIdx);
    const totalSpent = thisMonthTxs.reduce((sum, t) => sum + t.amount, 0);
    
    if (totalSpent + value > budget.totalLimit) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚨 Alert! Overspending",
          body: `This transaction puts you over your monthly limit!`,
          sound: true,
        },
        trigger: null, // Send immediately
      });
    }

    addTransaction({
      amount: value,
      category,
      note,
    });

    router.push('/');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <Text style={styles.title}>New Expense</Text>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <X color={darkTheme.textSecondary} size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.amountContainer}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={darkTheme.textSecondary}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  category === cat && styles.categoryPillActive
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[
                  styles.categoryText,
                  category === cat && styles.categoryTextActive
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Note (Optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="What was this for?"
            placeholderTextColor={darkTheme.border}
            value={note}
            onChangeText={setNote}
            multiline
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Transaction</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: darkTheme.text,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: darkTheme.card,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderBottomWidth: 2,
    borderBottomColor: darkTheme.border,
    paddingBottom: 16,
  },
  currency: {
    fontSize: 48,
    fontWeight: 'bold',
    color: darkTheme.textSecondary,
    marginRight: 8,
  },
  amountInput: {
    fontSize: 56,
    fontWeight: 'bold',
    color: darkTheme.text,
    minWidth: 150,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.textSecondary,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  categoryPill: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: darkTheme.card,
    borderWidth: 1,
    borderColor: darkTheme.border,
  },
  categoryPillActive: {
    backgroundColor: darkTheme.primary,
    borderColor: darkTheme.primary,
  },
  categoryText: {
    color: darkTheme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: darkTheme.text,
  },
  noteInput: {
    backgroundColor: darkTheme.inputBg,
    borderRadius: 16,
    padding: 16,
    color: darkTheme.text,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: darkTheme.border,
  },
  saveBtn: {
    backgroundColor: darkTheme.accent,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    shadowColor: darkTheme.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnText: {
    color: darkTheme.text,
    fontSize: 18,
    fontWeight: 'bold',
  }
});
