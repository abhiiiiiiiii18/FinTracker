import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Receipt,
  ArrowRight,
  CheckCircle,
  X,
  ChevronDown,
} from 'lucide-react-native';
import { useSplitStore, computeNetBalances, simplifyDebts, SplitShare } from '../store/useSplitStore';

const theme = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#3B82F6',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  border: '#334155',
  inputBg: '#0A1628',
};

// ─── Add Expense Modal ────────────────────────────────────────────────────────

function AddExpenseModal({
  visible,
  onClose,
  groupId,
  members,
}: {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  members: string[];
}) {
  const addExpense = useSplitStore((s) => s.addExpense);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(members[0] || '');
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [showPaidPicker, setShowPaidPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setDesc(''); setAmount(''); setPaidBy(members[0] || '');
    setSplitType('equal'); setCustomShares({}); onClose();
  };

  const handleSave = async () => {
    const total = parseFloat(amount);
    if (!desc.trim()) { Alert.alert('Missing', 'Enter a description.'); return; }
    if (isNaN(total) || total <= 0) { Alert.alert('Missing', 'Enter a valid amount.'); return; }

    let splits: SplitShare[];

    if (splitType === 'equal') {
      const share = Math.round((total / members.length) * 100) / 100;
      splits = members.map((m) => ({ name: m, amount: share }));
    } else {
      splits = members.map((m) => ({
        name: m,
        amount: parseFloat(customShares[m] || '0') || 0,
      }));
      const sumShares = splits.reduce((s, x) => s + x.amount, 0);
      if (Math.abs(sumShares - total) > 0.5) {
        Alert.alert('Mismatch', `Shares sum (₹${sumShares.toFixed(2)}) must equal total (₹${total.toFixed(2)}).`);
        return;
      }
    }

    setLoading(true);
    await addExpense(groupId, {
      description: desc.trim(),
      total_amount: total,
      paid_by: paidBy,
      split_type: splitType,
      splits,
    });
    setLoading(false);
    reset();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={reset}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity onPress={reset}><X color={theme.textSecondary} size={22} /></TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dinner, Hotel, Cab"
              placeholderTextColor={theme.textSecondary}
              value={desc}
              onChangeText={setDesc}
            />

            <Text style={styles.inputLabel}>Total Amount (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={theme.textSecondary}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            <Text style={styles.inputLabel}>Paid By</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowPaidPicker(!showPaidPicker)}>
              <Text style={styles.pickerText}>{paidBy}</Text>
              <ChevronDown color={theme.textSecondary} size={18} />
            </TouchableOpacity>
            {showPaidPicker && (
              <View style={styles.pickerDropdown}>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.pickerOption, m === paidBy && styles.pickerOptionSelected]}
                    onPress={() => { setPaidBy(m); setShowPaidPicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, m === paidBy && { color: theme.primary }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.inputLabel}>Split</Text>
            <View style={styles.splitToggle}>
              <TouchableOpacity
                style={[styles.toggleOption, splitType === 'equal' && styles.toggleOptionActive]}
                onPress={() => setSplitType('equal')}
              >
                <Text style={[styles.toggleText, splitType === 'equal' && styles.toggleTextActive]}>Equal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleOption, splitType === 'custom' && styles.toggleOptionActive]}
                onPress={() => setSplitType('custom')}
              >
                <Text style={[styles.toggleText, splitType === 'custom' && styles.toggleTextActive]}>Custom</Text>
              </TouchableOpacity>
            </View>

            {splitType === 'equal' && amount && !isNaN(parseFloat(amount)) && (
              <Text style={styles.equalHint}>
                Each person pays ₹{(parseFloat(amount) / members.length).toFixed(2)}
              </Text>
            )}

            {splitType === 'custom' && (
              <View style={styles.customSplitsContainer}>
                {members.map((m) => (
                  <View key={m} style={styles.customSplitRow}>
                    <Text style={styles.customSplitName}>{m}</Text>
                    <TextInput
                      style={styles.customSplitInput}
                      placeholder="₹0"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="decimal-pad"
                      value={customShares[m] || ''}
                      onChangeText={(v) => setCustomShares((p) => ({ ...p, [m]: v }))}
                    />
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Expense</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Detail Screen ───────────────────────────────────────────────────────

export default function SplitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { groups, settleDebt } = useSplitStore();
  const [addExpenseVisible, setAddExpenseVisible] = useState(false);

  const group = groups.find((g) => g.id === id);

  const { balances, debts } = useMemo(() => {
    if (!group) return { balances: {}, debts: [] };
    return {
      balances: computeNetBalances(group.expenses),
      debts: simplifyDebts(computeNetBalances(group.expenses)),
    };
  }, [group]);

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: theme.text, textAlign: 'center', marginTop: 80 }}>Group not found.</Text>
      </SafeAreaView>
    );
  }

  const handleSettle = (from: string, to: string, amount: number) => {
    Alert.alert(
      'Settle Up',
      `Mark that ${from} paid ${to} ₹${amount.toFixed(2)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Settle', style: 'default', onPress: () => settleDebt(group.id, from, to, amount) },
      ]
    );
  };

  const sortedExpenses = [...group.expenses].reverse();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{group.name}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddExpenseVisible(true)}>
          <Plus color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Members */}
        <View style={styles.membersRow}>
          {group.members.map((m) => (
            <View key={m} style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>{m[0].toUpperCase()}</Text>
            </View>
          ))}
          <Text style={styles.membersLabel}>{group.members.join(', ')}</Text>
        </View>

        {/* Balance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balances</Text>
          {debts.length === 0 ? (
            <View style={styles.settledBanner}>
              <CheckCircle color={theme.accent} size={20} />
              <Text style={styles.settledText}>All settled up! 🎉</Text>
            </View>
          ) : (
            debts.map((d, i) => (
              <View key={i} style={styles.debtCard}>
                <View style={styles.debtRow}>
                  <Text style={styles.debtName}>{d.from}</Text>
                  <ArrowRight color={theme.warning} size={16} />
                  <Text style={styles.debtName}>{d.to}</Text>
                  <Text style={styles.debtAmount}>₹{d.amount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.settleBtn}
                  onPress={() => handleSettle(d.from, d.to, d.amount)}
                >
                  <Text style={styles.settleBtnText}>Settle</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Expense List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses ({group.expenses.length})</Text>
          {sortedExpenses.length === 0 ? (
            <Text style={styles.emptyHint}>No expenses yet. Tap + to add one.</Text>
          ) : (
            sortedExpenses.map((exp) => (
              <View key={exp.id} style={styles.expCard}>
                <View style={styles.expIconWrap}>
                  <Receipt color={theme.primary} size={18} />
                </View>
                <View style={styles.expInfo}>
                  <Text style={styles.expDesc}>{exp.description}</Text>
                  <Text style={styles.expMeta}>Paid by {exp.paid_by} · {new Date(exp.created_at).toLocaleDateString()}</Text>
                  <View style={styles.expSplitChips}>
                    {exp.splits.map((s) => (
                      <View key={s.name} style={styles.expChip}>
                        <Text style={styles.expChipText}>{s.name}: ₹{s.amount.toFixed(0)}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Text style={styles.expTotal}>₹{exp.total_amount.toFixed(0)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <AddExpenseModal
        visible={addExpenseVisible}
        onClose={() => setAddExpenseVisible(false)}
        groupId={group.id}
        members={group.members}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: theme.text },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  membersRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 8 },
  memberBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#1D3461', justifyContent: 'center', alignItems: 'center',
  },
  memberBadgeText: { color: theme.primary, fontWeight: '700', fontSize: 13 },
  membersLabel: { fontSize: 13, color: theme.textSecondary, flex: 1 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 12 },
  settledBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#0D2B1F', borderRadius: 14, padding: 16,
  },
  settledText: { color: theme.accent, fontSize: 15, fontWeight: '600' },
  debtCard: {
    backgroundColor: theme.card, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  debtName: { fontSize: 15, fontWeight: '600', color: theme.text },
  debtAmount: { marginLeft: 'auto', fontSize: 16, fontWeight: '800', color: theme.warning },
  settleBtn: {
    backgroundColor: '#1D3461', borderRadius: 10, paddingVertical: 8,
    alignItems: 'center',
  },
  settleBtnText: { color: theme.primary, fontWeight: '700', fontSize: 13 },
  emptyHint: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 12 },
  expCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: theme.card, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: theme.border,
  },
  expIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#1D3461', justifyContent: 'center', alignItems: 'center',
    marginRight: 12, marginTop: 2,
  },
  expInfo: { flex: 1 },
  expDesc: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 3 },
  expMeta: { fontSize: 12, color: theme.textSecondary, marginBottom: 6 },
  expSplitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  expChip: {
    backgroundColor: '#162032', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  expChipText: { color: theme.textSecondary, fontSize: 11 },
  expTotal: { fontSize: 16, fontWeight: '800', color: theme.text },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: theme.text },
  inputLabel: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: theme.inputBg, borderRadius: 12, padding: 14,
    color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border, marginBottom: 16,
  },
  picker: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: theme.inputBg, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: theme.border, marginBottom: 16,
  },
  pickerText: { color: theme.text, fontSize: 15 },
  pickerDropdown: {
    backgroundColor: '#253047', borderRadius: 12, marginTop: -12, marginBottom: 16,
    borderWidth: 1, borderColor: theme.border, overflow: 'hidden',
  },
  pickerOption: { padding: 14 },
  pickerOptionSelected: { backgroundColor: '#1D3461' },
  pickerOptionText: { color: theme.text, fontSize: 14 },
  splitToggle: { flexDirection: 'row', backgroundColor: theme.inputBg, borderRadius: 12, marginBottom: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
  toggleOption: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  toggleOptionActive: { backgroundColor: theme.primary },
  toggleText: { color: theme.textSecondary, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
  equalHint: { color: theme.accent, fontSize: 13, marginBottom: 16, textAlign: 'center' },
  customSplitsContainer: { marginBottom: 16 },
  customSplitRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  customSplitName: { flex: 1, color: theme.text, fontSize: 15 },
  customSplitInput: {
    backgroundColor: theme.inputBg, borderRadius: 10, padding: 10, width: 90,
    color: theme.text, fontSize: 14, borderWidth: 1, borderColor: theme.border, textAlign: 'right',
  },
  saveBtn: { backgroundColor: theme.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
