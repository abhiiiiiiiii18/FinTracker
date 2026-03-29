import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Share,
  Linking,
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
  Share2,
  UserPlus,
  Smartphone,
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

// ─── Category emoji map ───────────────────────────────────────────────────────
const EXPENSE_ICONS: Record<string, string> = {
  food: '🍽️', dinner: '🍽️', lunch: '🥗', breakfast: '☕', cafe: '☕',
  hotel: '🏨', stay: '🏨', accommodation: '🏨',
  cab: '🚕', taxi: '🚕', uber: '🚕', auto: '🛺', bus: '🚌', train: '🚆', flight: '✈️', transport: '🚕',
  movie: '🎬', entertainment: '🎭', game: '🎮',
  grocery: '🛒', shopping: '🛍️',
  medicine: '💊', medical: '🏥',
  settlement: '✅',
};

function getExpenseEmoji(desc: string): string {
  const lower = desc.toLowerCase();
  for (const [key, emoji] of Object.entries(EXPENSE_ICONS)) {
    if (lower.includes(key)) return emoji;
  }
  return '💸';
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────

function AddExpenseModal({
  visible, onClose, groupId, members,
}: {
  visible: boolean; onClose: () => void; groupId: string; members: string[];
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
      splits = members.map((m) => ({ name: m, amount: parseFloat(customShares[m] || '0') || 0 }));
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
            <TextInput style={styles.input} placeholder="e.g. Dinner, Hotel, Cab"
              placeholderTextColor={theme.textSecondary} value={desc} onChangeText={setDesc} />

            <Text style={styles.inputLabel}>Total Amount (₹)</Text>
            <TextInput style={styles.input} placeholder="0.00"
              placeholderTextColor={theme.textSecondary} keyboardType="decimal-pad"
              value={amount} onChangeText={setAmount} />

            <Text style={styles.inputLabel}>Paid By</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowPaidPicker(!showPaidPicker)}>
              <Text style={styles.pickerText}>{paidBy}</Text>
              <ChevronDown color={theme.textSecondary} size={18} />
            </TouchableOpacity>
            {showPaidPicker && (
              <View style={styles.pickerDropdown}>
                {members.map((m) => (
                  <TouchableOpacity key={m} style={[styles.pickerOption, m === paidBy && styles.pickerOptionSelected]}
                    onPress={() => { setPaidBy(m); setShowPaidPicker(false); }}>
                    <Text style={[styles.pickerOptionText, m === paidBy && { color: theme.primary }]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={styles.inputLabel}>Split</Text>
            <View style={styles.splitToggle}>
              <TouchableOpacity style={[styles.toggleOption, splitType === 'equal' && styles.toggleOptionActive]}
                onPress={() => setSplitType('equal')}>
                <Text style={[styles.toggleText, splitType === 'equal' && styles.toggleTextActive]}>Equal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.toggleOption, splitType === 'custom' && styles.toggleOptionActive]}
                onPress={() => setSplitType('custom')}>
                <Text style={[styles.toggleText, splitType === 'custom' && styles.toggleTextActive]}>Custom</Text>
              </TouchableOpacity>
            </View>

            {splitType === 'equal' && amount && !isNaN(parseFloat(amount)) && (
              <Text style={styles.equalHint}>Each person pays ₹{(parseFloat(amount) / members.length).toFixed(2)}</Text>
            )}

            {splitType === 'custom' && (
              <View style={styles.customSplitsContainer}>
                {members.map((m) => (
                  <View key={m} style={styles.customSplitRow}>
                    <Text style={styles.customSplitName}>{m}</Text>
                    <TextInput style={styles.customSplitInput} placeholder="₹0"
                      placeholderTextColor={theme.textSecondary} keyboardType="decimal-pad"
                      value={customShares[m] || ''}
                      onChangeText={(v) => setCustomShares((p) => ({ ...p, [m]: v }))} />
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

// ─── Invite Member Modal ──────────────────────────────────────────────────────

function InviteMemberModal({
  visible, onClose, groupId,
}: {
  visible: boolean; onClose: () => void; groupId: string;
}) {
  const inviteMember = useSplitStore((s) => s.inviteMember);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!name.trim()) { Alert.alert('Missing', 'Enter a display name.'); return; }
    if (!email.trim() || !email.includes('@')) { Alert.alert('Missing', 'Enter a valid email.'); return; }
    setLoading(true);
    const error = await inviteMember(groupId, email.trim(), name.trim());
    setLoading(false);
    if (error) { Alert.alert('Failed', error); return; }
    Alert.alert('✅ Invited!', `${name} will see this group when they log in with ${email}.`);
    setEmail(''); setName(''); onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invite Member</Text>
            <TouchableOpacity onPress={onClose}><X color={theme.textSecondary} size={22} /></TouchableOpacity>
          </View>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Raj Kumar"
            placeholderTextColor={theme.textSecondary} value={name} onChangeText={setName} autoCapitalize="words" />
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput style={styles.input} placeholder="friend@email.com"
            placeholderTextColor={theme.textSecondary} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" />
          <Text style={[styles.inputLabel, { textTransform: 'none', marginBottom: 20 }]}>
            They'll see this group and receive expense notifications when they sign up.
          </Text>
          <TouchableOpacity style={styles.saveBtn} onPress={handleInvite} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Send Invite</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── UPI Settle Modal ─────────────────────────────────────────────────────────

function UPISettleModal({
  visible, onClose, from, to, amount, groupId,
}: {
  visible: boolean; onClose: () => void;
  from: string; to: string; amount: number; groupId: string;
}) {
  const settleDebt = useSplitStore((s) => s.settleDebt);
  const [upiId, setUpiId] = useState('');

  const openUPI = async () => {
    if (!upiId.trim()) { Alert.alert('Missing', 'Enter the UPI ID to pay.'); return; }
    const upiUrl = `upi://pay?pa=${upiId.trim()}&pn=${encodeURIComponent(to)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Settlement from ${from}`)}`;
    const canOpen = await Linking.canOpenURL(upiUrl);
    if (!canOpen) {
      Alert.alert('No UPI App', 'Install GPay, PhonePe or any UPI app to proceed.');
      return;
    }
    await Linking.openURL(upiUrl);
    // Mark as settled after opening UPI
    Alert.alert('Mark Settled?', 'Did you complete the payment?', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Yes, Settled!', onPress: () => { settleDebt(groupId, from, to, amount); onClose(); } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Pay via UPI</Text>
            <TouchableOpacity onPress={onClose}><X color={theme.textSecondary} size={22} /></TouchableOpacity>
          </View>
          <View style={styles.upiSummary}>
            <Text style={styles.upiSummaryText}>{from}</Text>
            <ArrowRight color={theme.warning} size={18} />
            <Text style={styles.upiSummaryText}>{to}</Text>
            <Text style={styles.upiAmount}>₹{amount.toFixed(2)}</Text>
          </View>
          <Text style={styles.inputLabel}>{to}'s UPI ID</Text>
          <TextInput style={styles.input} placeholder="e.g. raj@upi or 9876543210@paytm"
            placeholderTextColor={theme.textSecondary} value={upiId} onChangeText={setUpiId}
            autoCapitalize="none" keyboardType="email-address" />
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#7C3AED' }]} onPress={openUPI}>
            <Smartphone color="#fff" size={20} />
            <Text style={styles.saveBtnText}>Open GPay / PhonePe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.card, marginTop: 10 }]}
            onPress={() => { settleDebt(groupId, from, to, amount); onClose(); }}>
            <Text style={[styles.saveBtnText, { color: theme.accent }]}>Mark as Settled (no UPI)</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Detail Screen ───────────────────────────────────────────────────────

export default function SplitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { groups } = useSplitStore();
  const [addExpenseVisible, setAddExpenseVisible] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [upiSettle, setUpiSettle] = useState<{ from: string; to: string; amount: number } | null>(null);

  const group = groups.find((g) => g.id === id);

  const debts = useMemo(() => {
    if (!group) return [];
    return simplifyDebts(computeNetBalances(group.expenses));
  }, [group]);

  if (!group) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: theme.text, textAlign: 'center', marginTop: 80 }}>Group not found.</Text>
      </SafeAreaView>
    );
  }

  const totalSpent = group.expenses
    .filter((e) => !e.description.startsWith('✅'))
    .reduce((s, e) => s + e.total_amount, 0);

  const handleShare = async () => {
    const lines = [`💸 *${group.name}* — Balance Summary\n`];
    if (debts.length === 0) {
      lines.push('✅ All settled up!');
    } else {
      debts.forEach((d) => lines.push(`• ${d.from} owes ${d.to} ₹${d.amount.toFixed(0)}`));
    }
    lines.push(`\nTotal group spend: ₹${totalSpent.toFixed(0)}`);
    lines.push('\n_Tracked with FinTracker_');
    await Share.share({ message: lines.join('\n') });
  };

  const memberNames = group.members.map((m) => m.name ?? (m as any));
  const sortedExpenses = [...group.expenses].reverse();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft color={theme.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{group.name}</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
          <Share2 color={theme.primary} size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setInviteVisible(true)}>
          <UserPlus color={theme.accent} size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddExpenseVisible(true)}>
          <Plus color="#fff" size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* Group Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{totalSpent.toFixed(0)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{group.members.length}</Text>
            <Text style={styles.statLabel}>Members</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{group.expenses.length}</Text>
            <Text style={styles.statLabel}>Expenses</Text>
          </View>
        </View>

        {/* Members row */}
        <View style={styles.membersRow}>
          {group.members.map((m, i) => {
            const name = m.name ?? (m as any);
            const isPending = m.status === 'pending';
            return (
              <View key={i} style={[styles.memberBadge, isPending && styles.memberBadgePending]}>
                <Text style={styles.memberBadgeText}>{name[0]?.toUpperCase()}</Text>
              </View>
            );
          })}
          <Text style={styles.membersLabel} numberOfLines={1}>
            {group.members.map((m) => m.name ?? (m as any)).join(', ')}
          </Text>
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
                  <View style={styles.debtAvatar}><Text style={styles.debtAvatarText}>{d.from[0]}</Text></View>
                  <Text style={styles.debtName}>{d.from}</Text>
                  <ArrowRight color={theme.warning} size={14} />
                  <Text style={styles.debtName}>{d.to}</Text>
                  <Text style={styles.debtAmount}>₹{d.amount.toFixed(0)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.settleBtn}
                  onPress={() => setUpiSettle({ from: d.from, to: d.to, amount: d.amount })}
                >
                  <Smartphone color="#fff" size={14} />
                  <Text style={styles.settleBtnText}>Pay via UPI</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Expense List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses</Text>
          {sortedExpenses.length === 0 ? (
            <Text style={styles.emptyHint}>No expenses yet. Tap + to add one.</Text>
          ) : (
            sortedExpenses.map((exp) => (
              <View key={exp.id} style={styles.expCard}>
                <View style={styles.expIconWrap}>
                  <Text style={styles.expEmoji}>{getExpenseEmoji(exp.description)}</Text>
                </View>
                <View style={styles.expInfo}>
                  <Text style={styles.expDesc}>{exp.description}</Text>
                  <Text style={styles.expMeta}>
                    {exp.paid_by} paid · {new Date(exp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
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

      <AddExpenseModal visible={addExpenseVisible} onClose={() => setAddExpenseVisible(false)}
        groupId={group.id} members={memberNames} />
      <InviteMemberModal visible={inviteVisible} onClose={() => setInviteVisible(false)} groupId={group.id} />
      {upiSettle && (
        <UPISettleModal
          visible={!!upiSettle}
          onClose={() => setUpiSettle(null)}
          from={upiSettle.from}
          to={upiSettle.to}
          amount={upiSettle.amount}
          groupId={group.id}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 40, paddingBottom: 16, gap: 8 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: theme.text },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.card, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  statValue: { fontSize: 20, fontWeight: '900', color: theme.text },
  statLabel: { fontSize: 11, color: theme.textSecondary, marginTop: 2 },
  // Members
  membersRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 6 },
  memberBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1D3461', justifyContent: 'center', alignItems: 'center' },
  memberBadgePending: { backgroundColor: '#2D2010', borderWidth: 1, borderColor: theme.warning },
  memberBadgeText: { color: theme.primary, fontWeight: '700', fontSize: 13 },
  membersLabel: { fontSize: 12, color: theme.textSecondary, flex: 1 },
  // Sections
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: theme.text, marginBottom: 12 },
  settledBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#0D2B1F', borderRadius: 14, padding: 16 },
  settledText: { color: theme.accent, fontSize: 15, fontWeight: '600' },
  // Debt cards
  debtCard: { backgroundColor: theme.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  debtAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1D3461', justifyContent: 'center', alignItems: 'center' },
  debtAvatarText: { color: theme.primary, fontWeight: '700', fontSize: 12 },
  debtName: { fontSize: 14, fontWeight: '600', color: theme.text },
  debtAmount: { marginLeft: 'auto', fontSize: 16, fontWeight: '900', color: theme.warning },
  settleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C3AED', borderRadius: 10, paddingVertical: 9 },
  settleBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Expenses
  emptyHint: { color: theme.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 12 },
  expCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: theme.border },
  expIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#162032', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 },
  expEmoji: { fontSize: 20 },
  expInfo: { flex: 1 },
  expDesc: { fontSize: 15, fontWeight: '600', color: theme.text, marginBottom: 3 },
  expMeta: { fontSize: 12, color: theme.textSecondary, marginBottom: 6 },
  expSplitChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  expChip: { backgroundColor: '#162032', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  expChipText: { color: theme.textSecondary, fontSize: 11 },
  expTotal: { fontSize: 16, fontWeight: '800', color: theme.text },
  // UPI summary
  upiSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1A2E', borderRadius: 12, padding: 16, marginBottom: 20 },
  upiSummaryText: { fontSize: 15, fontWeight: '700', color: theme.text },
  upiAmount: { marginLeft: 'auto', fontSize: 18, fontWeight: '900', color: theme.warning },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: theme.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: theme.text },
  inputLabel: { fontSize: 12, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: theme.inputBg, borderRadius: 12, padding: 14, color: theme.text, fontSize: 15, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.inputBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.border, marginBottom: 16 },
  pickerText: { color: theme.text, fontSize: 15 },
  pickerDropdown: { backgroundColor: '#253047', borderRadius: 12, marginTop: -12, marginBottom: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
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
  customSplitInput: { backgroundColor: theme.inputBg, borderRadius: 10, padding: 10, width: 90, color: theme.text, fontSize: 14, borderWidth: 1, borderColor: theme.border, textAlign: 'right' },
  saveBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: theme.primary, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
