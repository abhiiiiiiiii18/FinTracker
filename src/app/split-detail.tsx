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
  ArrowRight,
  CheckCircle,
  X,
  ChevronDown,
  Share2,
  UserPlus,
  Smartphone,
  WalletCards,
} from 'lucide-react-native';
import { useSplitStore, computeNetBalances, simplifyDebts, SplitShare } from '../store/useSplitStore';
import { colors, radius, shadow } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

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
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity onPress={reset} style={styles.modalCloseBtn}><X color={colors.textMuted} size={20} /></TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput style={styles.input} placeholder="e.g. Dinner, Hotel, Cab"
              placeholderTextColor={colors.textFaint} value={desc} onChangeText={setDesc} />

            <Text style={styles.inputLabel}>Total Amount (₹)</Text>
            <TextInput style={styles.input} placeholder="0.00"
              placeholderTextColor={colors.textFaint} keyboardType="decimal-pad"
              value={amount} onChangeText={setAmount} />

            <Text style={styles.inputLabel}>Paid By</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowPaidPicker(!showPaidPicker)} activeOpacity={0.8}>
              <Text style={styles.pickerText}>{paidBy}</Text>
              <ChevronDown color={colors.text} size={18} />
            </TouchableOpacity>
            
            {showPaidPicker && (
              <View style={styles.pickerDropdown}>
                {members.map((m) => (
                  <TouchableOpacity key={m} style={[styles.pickerOption, m === paidBy && styles.pickerOptionSelected]}
                    onPress={() => { setPaidBy(m); setShowPaidPicker(false); }}>
                    <Text style={[styles.pickerOptionText, m === paidBy && { color: colors.violet, fontWeight: '800' }]}>{m}</Text>
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
              <View style={styles.equalHintBox}>
                <Text style={styles.equalHint}>Each person pays ₹{(parseFloat(amount) / members.length).toFixed(2)}</Text>
              </View>
            )}

            {splitType === 'custom' && (
              <View style={styles.customSplitsContainer}>
                {members.map((m) => (
                  <View key={m} style={styles.customSplitRow}>
                    <Text style={styles.customSplitName}>{m}</Text>
                    <TextInput style={styles.customSplitInput} placeholder="₹0"
                      placeholderTextColor={colors.textFaint} keyboardType="decimal-pad"
                      value={customShares[m] || ''}
                      onChangeText={(v) => setCustomShares((p) => ({ ...p, [m]: v }))} />
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity onPress={handleSave} disabled={loading} activeOpacity={0.8} style={{ marginTop: 12 }}>
               <LinearGradient
                  colors={['#6D28D9', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveBtn}
               >
                 {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Expense</Text>}
               </LinearGradient>
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
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Invite Member</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}><X color={colors.textMuted} size={20} /></TouchableOpacity>
          </View>
          <Text style={styles.inputLabel}>Display Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Raj Kumar"
            placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} autoCapitalize="words" />
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput style={styles.input} placeholder="friend@email.com"
            placeholderTextColor={colors.textFaint} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none" />
          
          <View style={styles.inviteHintBox}>
             <Text style={styles.inviteHint}>They'll see this group and receive notifications instantly upon signup.</Text>
          </View>
          
          <TouchableOpacity onPress={handleInvite} disabled={loading} activeOpacity={0.8}>
             <LinearGradient
                colors={['#059669', '#10B981']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.saveBtn, shadow.mint]}
             >
               {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Send Invite</Text>}
             </LinearGradient>
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
    Alert.alert('Mark Settled?', 'Did you complete the payment?', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Yes, Settled!', onPress: () => { settleDebt(groupId, from, to, amount); onClose(); } },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settle Up</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}><X color={colors.textMuted} size={20} /></TouchableOpacity>
          </View>
          
          <View style={styles.upiCard}>
            <View style={styles.upiRow}>
               <View style={styles.upiAvatarWrap}><Text style={styles.upiAvatar}>{from[0]}</Text></View>
               <Text style={styles.upiName}>{from}</Text>
            </View>
            <View style={styles.upiArrowRow}>
               <ArrowRight color={colors.amber} size={20} />
               <Text style={styles.upiBigAmount}>₹{amount.toFixed(2)}</Text>
            </View>
            <View style={styles.upiRow}>
               <View style={[styles.upiAvatarWrap, { backgroundColor: colors.violetGlow }]}><Text style={[styles.upiAvatar, { color: colors.violet }]}>{to[0]}</Text></View>
               <Text style={styles.upiName}>{to}</Text>
            </View>
          </View>
          
          <Text style={styles.inputLabel}>{to}'s UPI ID</Text>
          <TextInput style={styles.input} placeholder="e.g. raj@upi or 9876543210@paytm"
            placeholderTextColor={colors.textFaint} value={upiId} onChangeText={setUpiId}
            autoCapitalize="none" keyboardType="email-address" />
            
          <TouchableOpacity onPress={openUPI} activeOpacity={0.8} style={{ marginBottom: 16 }}>
             <LinearGradient
                colors={['#6D28D9', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.saveBtn, { flexDirection: 'row', gap: 10 }]}
             >
                <Smartphone color="#fff" size={20} />
                <Text style={styles.saveBtnText}>Open UPI App</Text>
             </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.markSettledBtn}
            onPress={() => { settleDebt(groupId, from, to, amount); onClose(); }}>
            <Text style={styles.markSettledBtnText}>Mark as Settled (Skip UPI)</Text>
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
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 80 }}>Group not found.</Text>
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
          <ArrowLeft color={colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        <View style={styles.headerActions}>
           <TouchableOpacity style={styles.iconBtn} onPress={handleShare}>
             <Share2 color={colors.text} size={20} />
           </TouchableOpacity>
           <TouchableOpacity style={styles.iconBtn} onPress={() => setInviteVisible(true)}>
             <UserPlus color={colors.sky} size={20} />
           </TouchableOpacity>
           <TouchableOpacity style={styles.addBtn} onPress={() => setAddExpenseVisible(true)}>
             <Plus color="#fff" size={20} />
           </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Group Stats Card */}
        <LinearGradient
          colors={['#1E293B', '#0F172A']}
          style={styles.statsCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.statCol}>
            <WalletCards color={colors.violet} size={28} style={{ marginBottom: 12 }} />
            <Text style={styles.statLabel}>Total Group Spend</Text>
            <Text style={styles.statValueBig}>₹{totalSpent.toFixed(0)}</Text>
          </View>
          
          <View style={styles.statDivider} />
          
          <View style={styles.statColMini}>
             <View style={{ gap: 16 }}>
                <View>
                   <Text style={styles.statLabel}>Members</Text>
                   <Text style={styles.statValueMini}>{group.members.length}</Text>
                </View>
                <View>
                   <Text style={styles.statLabel}>Expenses</Text>
                   <Text style={styles.statValueMini}>{group.expenses.length}</Text>
                </View>
             </View>
          </View>
        </LinearGradient>

        {/* Members row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersRowContainer}>
           <View style={styles.membersRow}>
             {group.members.map((m, i) => {
               const name = m.name ?? (m as any);
               const isPending = m.status === 'pending';
               return (
                 <View key={i} style={styles.memberBadgeWrap}>
                    <View style={[styles.memberBadge, isPending && styles.memberBadgePending]}>
                      <Text style={styles.memberBadgeText}>{name[0]?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.memberNameSmall}>{name.split(' ')[0]}</Text>
                 </View>
               );
             })}
           </View>
        </ScrollView>

        {/* Balance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Balances</Text>
          {debts.length === 0 ? (
            <View style={styles.settledBanner}>
              <View style={styles.settledIconWrap}>
                 <CheckCircle color={colors.mint} size={24} />
              </View>
              <View>
                 <Text style={styles.settledText}>All settled up!</Text>
                 <Text style={styles.settledSub}>No one owes anything.</Text>
              </View>
            </View>
          ) : (
            debts.map((d, i) => (
              <View key={i} style={styles.debtCard}>
                <View style={styles.debtRow}>
                  <View style={styles.debtAvatar}><Text style={styles.debtAvatarText}>{d.from[0]}</Text></View>
                  <Text style={styles.debtName}>{d.from}</Text>
                  <Text style={styles.debtOwesText}>owes</Text>
                  <Text style={styles.debtName}>{d.to}</Text>
                  <Text style={styles.debtAmount}>₹{d.amount.toFixed(0)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.settleBtn}
                  onPress={() => setUpiSettle({ from: d.from, to: d.to, amount: d.amount })}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                     colors={['#8B5CF6', '#6D28D9']}
                     start={{ x: 0, y: 0 }}
                     end={{ x: 1, y: 0 }}
                     style={styles.settleBtnGradient}
                  >
                     <Smartphone color="#fff" size={16} />
                     <Text style={styles.settleBtnText}>Settle Up</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* Expense List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Expenses</Text>
          {sortedExpenses.length === 0 ? (
            <View style={styles.emptyExpBox}>
               <Text style={{ fontSize: 40, marginBottom: 12 }}>🧾</Text>
               <Text style={styles.emptyExpText}>No expenses yet in this group.</Text>
            </View>
          ) : (
            sortedExpenses.map((exp) => {
              const isSettlement = exp.description.startsWith('✅');
              return (
                 <View key={exp.id} style={styles.expCard}>
                   <View style={[styles.expIconWrap, isSettlement && { backgroundColor: colors.mintGlow }]}>
                     <Text style={styles.expEmoji}>{getExpenseEmoji(exp.description)}</Text>
                   </View>
                   <View style={styles.expInfo}>
                     <Text style={styles.expDesc}>{exp.description}</Text>
                     <Text style={styles.expMeta}>
                       {isSettlement ? exp.paid_by : `${exp.paid_by} paid`} · {new Date(exp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                     </Text>
                     {!isSettlement && (
                        <Text style={styles.expSplitText} numberOfLines={1}>
                          {exp.splits.map(s => `${s.name}: ₹${s.amount.toFixed(0)}`).join(', ')}
                        </Text>
                     )}
                   </View>
                   <Text style={[styles.expTotal, isSettlement && { color: colors.mint }]}>
                      ₹{exp.total_amount.toFixed(0)}
                   </Text>
                 </View>
              );
            })
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
  container: { flex: 1, backgroundColor: colors.bg },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 44, paddingBottom: 16, gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.violet, justifyContent: 'center', alignItems: 'center', ...shadow.violet },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  
  // Stats Card
  statsCard: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    ...shadow.dark,
  },
  statCol: { flex: 2 },
  statColMini: { flex: 1, paddingLeft: 24, justifyContent: 'center' },
  statDivider: { width: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)' },
  statLabel: { fontSize: 13, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  statValueBig: { fontSize: 40, fontWeight: '900', color: colors.text, letterSpacing: -1 },
  statValueMini: { fontSize: 20, fontWeight: '800', color: colors.text },
  
  // Members
  membersRowContainer: { marginBottom: 32 },
  membersRow: { flexDirection: 'row', gap: 14, paddingRight: 20 },
  memberBadgeWrap: { alignItems: 'center', gap: 6 },
  memberBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(59, 130, 246, 0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  memberBadgePending: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: colors.amber, borderStyle: 'dashed' },
  memberBadgeText: { color: colors.blue, fontWeight: '800', fontSize: 18 },
  memberNameSmall: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  
  // Sections
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 16, letterSpacing: -0.5 },
  
  // Settled Banner
  settledBanner: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: colors.mintGlow, borderRadius: radius.lg, padding: 20, borderWidth: 1, borderColor: colors.borderMint },
  settledIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(16, 185, 129, 0.2)', justifyContent: 'center', alignItems: 'center' },
  settledText: { color: colors.mint, fontSize: 17, fontWeight: '800' },
  settledSub: { color: colors.mint, fontSize: 13, opacity: 0.8, marginTop: 2 },
  
  // Debt cards
  debtCard: { backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  debtRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  debtAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(139, 92, 246, 0.2)', justifyContent: 'center', alignItems: 'center' },
  debtAvatarText: { color: colors.violet, fontWeight: '800', fontSize: 13 },
  debtName: { fontSize: 15, fontWeight: '700', color: colors.text },
  debtOwesText: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  debtAmount: { marginLeft: 'auto', fontSize: 18, fontWeight: '900', color: colors.amber },
  settleBtn: { borderRadius: radius.md, overflow: 'hidden' },
  settleBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12 },
  settleBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  
  // Expenses
  emptyExpBox: { alignItems: 'center', paddingVertical: 40, backgroundColor: colors.bgCard, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed' },
  emptyExpText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  expCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.bgCard, borderRadius: radius.lg, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border, ...shadow.card },
  expIconWrap: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.bgCardAlt, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  expEmoji: { fontSize: 24 },
  expInfo: { flex: 1 },
  expDesc: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 4 },
  expMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  expSplitText: { fontSize: 11, color: colors.textFaint },
  expTotal: { fontSize: 18, fontWeight: '800', color: colors.text },
  
  // Modal Common
  modalOverlay: { flex: 1, backgroundColor: 'rgba(5, 7, 18, 0.85)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bgCard, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 24, paddingBottom: 40, maxHeight: '95%', borderWidth: 1, borderColor: colors.border, borderBottomWidth: 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  inputLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5 },
  input: { backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: 16, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  
  // Picker
  picker: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgDeep, borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 20 },
  pickerText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  pickerDropdown: { backgroundColor: colors.bgCardAlt, borderRadius: radius.md, marginTop: -16, marginBottom: 20, borderWidth: 1, borderColor: colors.borderBright, overflow: 'hidden' },
  pickerOption: { padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptionSelected: { backgroundColor: 'rgba(139, 92, 246, 0.1)' },
  pickerOptionText: { color: colors.text, fontSize: 15 },
  
  // Add Expense Splitting
  splitToggle: { flexDirection: 'row', backgroundColor: colors.bgDeep, borderRadius: radius.md, marginBottom: 20, borderWidth: 1, borderColor: colors.border, padding: 4 },
  toggleOption: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: radius.sm },
  toggleOptionActive: { backgroundColor: colors.violet },
  toggleText: { color: colors.textMuted, fontWeight: '700' },
  toggleTextActive: { color: '#fff' },
  equalHintBox: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingVertical: 12, borderRadius: radius.md, marginBottom: 20 },
  equalHint: { color: colors.mint, fontSize: 14, textAlign: 'center', fontWeight: '700' },
  customSplitsContainer: { marginBottom: 20, gap: 12 },
  customSplitRow: { flexDirection: 'row', alignItems: 'center' },
  customSplitName: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '600' },
  customSplitInput: { backgroundColor: colors.bgDeep, borderRadius: radius.sm, paddingHorizontal: 16, paddingVertical: 10, width: 100, color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border, textAlign: 'right', fontWeight: '700' },
  
  // Save Buttons
  saveBtn: { borderRadius: radius.pill, padding: 18, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  
  // Invite
  inviteHintBox: { backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 16, borderRadius: radius.md, marginBottom: 24 },
  inviteHint: { color: colors.blue, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  
  // UPI
  upiCard: { backgroundColor: colors.bgDeep, borderRadius: radius.lg, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: colors.border },
  upiRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  upiAvatarWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCardAlt, justifyContent: 'center', alignItems: 'center' },
  upiAvatar: { color: colors.textMuted, fontSize: 18, fontWeight: '800' },
  upiName: { fontSize: 16, fontWeight: '700', color: colors.text },
  upiArrowRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginLeft: 22, paddingVertical: 12, borderLeftWidth: 2, borderLeftColor: colors.border, borderStyle: 'dotted' },
  upiBigAmount: { fontSize: 32, fontWeight: '900', color: colors.amber, letterSpacing: -1 },
  markSettledBtn: { paddingVertical: 16, alignItems: 'center', backgroundColor: colors.bgCardAlt, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  markSettledBtnText: { color: colors.textMuted, fontWeight: '700', fontSize: 15 },
});
