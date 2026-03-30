import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Plus, Trash2, ChevronRight, X, UserPlus, BookUser } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { useSplitStore, computeNetBalances, simplifyDebts, GroupInvitation } from '../store/useSplitStore';
import type { Group } from '../store/useSplitStore';
import { colors, radius, shadow } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

// ─── Group list item ──────────────────────────────────────────────────────────

function GroupCard({ group, onPress, onDelete }: { group: Group; onPress: () => void; onDelete: () => void }) {
  const debts = simplifyDebts(computeNetBalances(group.expenses));
  const totalOwed = debts.reduce((s, d) => s + d.amount, 0);

  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['#4C1D95', '#6D28D9', '#7C3AED']}
        style={styles.groupIcon}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Users color="#fff" size={20} />
      </LinearGradient>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.groupMeta}>
          {group.members.length} members · {group.expenses.length} expenses
        </Text>
        {totalOwed > 0 && (
          <View style={styles.debtBadge}>
            <Text style={styles.groupDebt}>₹{totalOwed.toFixed(0)} unsettled</Text>
          </View>
        )}
        {totalOwed === 0 && group.expenses.length > 0 && (
          <View style={styles.settledBadge}>
            <Text style={styles.groupSettled}>✓ All settled</Text>
          </View>
        )}
      </View>
      <View style={styles.groupActions}>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Trash2 color={colors.rose} size={18} />
        </TouchableOpacity>
        <ChevronRight color={colors.borderBright} size={20} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Multi-select Contacts Picker ────────────────────────────────────────────

function ContactsPickerModal({
  visible, onClose, onSelect, alreadyAdded,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (names: string[]) => void;
  alreadyAdded: string[];
}) {
  const [allContacts, setAllContacts] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    (async () => {
      setLoading(true);
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow contacts access to pick friends.');
        onClose();
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.FirstName, Contacts.Fields.LastName],
        sort: Contacts.SortTypes.FirstName,
      });
      const names = (data || [])
        .map((c) => {
          if (c.name?.trim()) return c.name.trim();
          const parts = [c.firstName, c.lastName].filter(Boolean);
          return parts.length > 0 ? parts.join(' ') : null;
        })
        .filter(Boolean) as string[];
        
      const uniqueNames = Array.from(new Set(names));
      setAllContacts(uniqueNames);
      setFiltered(uniqueNames);
      setLoading(false);
    })();
  }, [visible]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(q ? allContacts.filter((n) => n.toLowerCase().includes(q)) : allContacts);
  }, [search, allContacts]);

  const toggle = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const handleDone = () => {
    onSelect(Array.from(selected));
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  const handleClose = () => {
    setSelected(new Set());
    setSearch('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.cpContainer}>
        <View style={styles.cpHeader}>
          <TouchableOpacity onPress={handleClose} style={styles.cpCloseBtn}>
            <X color={colors.textMuted} size={22} />
          </TouchableOpacity>
          <Text style={styles.cpTitle}>Select Members</Text>
          <TouchableOpacity
            style={[styles.cpDoneBtn, selected.size === 0 && styles.cpDoneBtnDisabled]}
            onPress={handleDone}
            disabled={selected.size === 0}
          >
            <Text style={styles.cpDoneText}>
              Add{selected.size > 0 ? ` (${selected.size})` : ''}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cpSearchRow}>
          <TextInput
            style={styles.cpSearch}
            placeholder="Search contacts…"
            placeholderTextColor={colors.textFaint}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={colors.violet} style={{ marginTop: 60 }} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingBottom: 40 }}
            renderItem={({ item }) => {
              const isSelected = selected.has(item);
              const isDisabled = alreadyAdded.includes(item);
              return (
                <Pressable
                  style={[styles.cpRow, isSelected && styles.cpRowSelected]}
                  onPress={() => !isDisabled && toggle(item)}
                >
                  <View style={[styles.cpCheckbox, isSelected && styles.cpCheckboxSelected]}>
                    {isSelected && <Text style={styles.cpCheckmark}>✓</Text>}
                  </View>
                  <Text style={[styles.cpName, isDisabled && { color: colors.textMuted }]}>
                    {item}{isDisabled ? ' (added)' : ''}
                  </Text>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── New Group Modal ──────────────────────────────────────────────────────────

function NewGroupModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createGroup = useSplitStore((s) => s.createGroup);
  const [name, setName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactsPickerVisible, setContactsPickerVisible] = useState(false);

  const addMember = () => {
    const trimmed = memberInput.trim();
    if (!trimmed) return;
    if (members.includes(trimmed)) {
      Alert.alert('Duplicate', `${trimmed} is already added.`);
      return;
    }
    setMembers((prev) => [...prev, trimmed]);
    setMemberInput('');
  };

  const pickFromContacts = () => setContactsPickerVisible(true);

  const handleContactsSelected = (names: string[]) => {
    const newOnes = names.filter((n) => !members.includes(n));
    if (newOnes.length > 0) setMembers((prev) => [...prev, ...newOnes]);
  };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Missing', 'Please enter a group name.'); return; }
    if (members.length < 2) { Alert.alert('Missing', 'Add at least 2 members.'); return; }
    setLoading(true);
    await createGroup(name.trim(), members.map((m) => ({ name: m })));
    setLoading(false);
    setName('');
    setMembers([]);
    onClose();
  };

  const reset = () => { setName(''); setMemberInput(''); setMembers([]); setContactsPickerVisible(false); onClose(); };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={reset}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Group</Text>
              <TouchableOpacity onPress={reset} style={styles.modalCloseBtn}><X color={colors.textMuted} size={20} /></TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Group Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Goa Trip, Flatmates"
              placeholderTextColor={colors.textFaint}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Add Members</Text>
            <View style={styles.memberInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Enter name"
                placeholderTextColor={colors.textFaint}
                value={memberInput}
                onChangeText={setMemberInput}
                onSubmitEditing={addMember}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.addMemberBtn} onPress={addMember}>
                <UserPlus color={colors.violet} size={20} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addMemberBtn, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]} onPress={pickFromContacts}>
                <BookUser color={colors.mint} size={20} />
              </TouchableOpacity>
            </View>

            {members.length > 0 && (
              <View style={styles.memberChips}>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={styles.chip}
                    onPress={() => setMembers((prev) => prev.filter((x) => x !== m))}
                  >
                    <Text style={styles.chipText}>{m}</Text>
                    <X color={colors.textMuted} size={12} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <Text style={styles.hintText}>Tap a name to remove it</Text>

            <TouchableOpacity onPress={handleCreate} disabled={loading} activeOpacity={0.8}>
               <LinearGradient
                  colors={['#6D28D9', '#8B5CF6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.createBtn}
               >
                 {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create Group</Text>}
               </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <ContactsPickerModal
        visible={contactsPickerVisible}
        onClose={() => setContactsPickerVisible(false)}
        onSelect={handleContactsSelected}
        alreadyAdded={members}
      />
    </>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SplitsScreen() {
  const { groups, isLoaded, fetchGroups, deleteGroup, pendingInvitations, fetchPendingInvitations, acceptInvitation } = useSplitStore();
  const [modalVisible, setModalVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchGroups();
    fetchPendingInvitations();
  }, []);

  const handleAcceptInvite = (inv: GroupInvitation) => {
    Alert.alert(
      'Join Group',
      `Accept invitation to join this group?`,
      [
        { text: 'Decline', style: 'cancel' },
        { text: 'Join', onPress: () => acceptInvitation(inv.id, inv.group_id) },
      ]
    );
  };

  const handleDelete = (group: Group) => {
    Alert.alert(
      'Delete Group',
      `Delete "${group.name}" and all its expenses? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteGroup(group.id) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Bill Splits</Text>
        <TouchableOpacity style={styles.newGroupBtn} onPress={() => setModalVisible(true)}>
          <Plus color="#fff" size={18} />
          <Text style={styles.newGroupBtnText}>New Group</Text>
        </TouchableOpacity>
      </View>

      {/* Pending invitations banner */}
      {pendingInvitations.length > 0 && (
        <View style={styles.inviteBanner}>
          <Text style={styles.inviteBannerTitle}>📬 {pendingInvitations.length} pending invite{pendingInvitations.length > 1 ? 's' : ''}</Text>
          {pendingInvitations.map((inv) => (
            <TouchableOpacity key={inv.id} style={styles.inviteRow} onPress={() => handleAcceptInvite(inv)}>
              <Text style={styles.inviteText}>Tap to join group</Text>
              <Text style={styles.inviteAccept}>Accept →</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {!isLoaded ? (
        <ActivityIndicator color={colors.violet} style={{ marginTop: 60 }} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconWrap}>
             <Users color={colors.violet} size={48} />
          </View>
          <Text style={styles.emptyTitle}>No groups yet</Text>
          <Text style={styles.emptySubtitle}>Create a group to start splitting bills with friends.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              onPress={() => router.push({ pathname: '/split-detail', params: { id: item.id } })}
              onDelete={() => handleDelete(item)}
            />
          )}
        />
      )}

      <NewGroupModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },
  title: { fontSize: 32, fontWeight: '900', color: colors.text, letterSpacing: -1 },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.violet,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    gap: 6,
    ...shadow.violet,
  },
  newGroupBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  list: { paddingHorizontal: 20, paddingBottom: 110 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  groupIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 4 },
  groupMeta: { fontSize: 13, color: colors.textMuted },
  debtBadge: { alignSelf: 'flex-start', backgroundColor: colors.amberGlow, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  groupDebt: { fontSize: 12, color: colors.amber, fontWeight: '700' },
  settledBadge: { alignSelf: 'flex-start', backgroundColor: colors.mintGlow, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  groupSettled: { fontSize: 12, color: colors.mint, fontWeight: '700' },
  groupActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  deleteBtn: { padding: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: -80 },
  emptyIconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  emptySubtitle: { fontSize: 15, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(5, 7, 18, 0.8)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: '900', color: colors.text, letterSpacing: -0.5 },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bgDeep, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  inputLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1.5 },
  input: {
    backgroundColor: colors.bgDeep,
    borderRadius: radius.md,
    padding: 16,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  memberInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  addMemberBtn: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgDeep,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  hintText: { fontSize: 12, color: colors.textFaint, marginBottom: 28 },
  createBtn: {
    borderRadius: radius.pill,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    ...shadow.violet,
  },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  
  // Invite banner
  inviteBanner: {
    marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.mintGlow,
    borderRadius: radius.md, padding: 16, borderWidth: 1, borderColor: colors.borderMint,
  },
  inviteBannerTitle: { color: colors.mint, fontWeight: '800', fontSize: 15, marginBottom: 8 },
  inviteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  inviteText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  inviteAccept: { color: colors.mint, fontWeight: '800', fontSize: 14 },
  
  // Contacts picker
  cpContainer: { flex: 1, backgroundColor: colors.bg },
  cpHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  cpCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.bgCard, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  cpTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  cpDoneBtn: { backgroundColor: colors.violet, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 10 },
  cpDoneBtnDisabled: { backgroundColor: colors.borderBright },
  cpDoneText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  cpSearchRow: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  cpSearch: {
    backgroundColor: colors.bgCardAlt, borderRadius: radius.pill, paddingHorizontal: 20, paddingVertical: 14,
    color: colors.text, fontSize: 15, borderWidth: 1, borderColor: colors.border,
  },
  cpRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: colors.borderSubtle,
  },
  cpRowSelected: { backgroundColor: 'rgba(139, 92, 246, 0.08)' },
  cpCheckbox: {
    width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: colors.textMuted,
    marginRight: 16, justifyContent: 'center', alignItems: 'center',
  },
  cpCheckboxSelected: { backgroundColor: colors.violet, borderColor: colors.violet },
  cpCheckmark: { color: '#fff', fontSize: 14, fontWeight: '900' },
  cpName: { fontSize: 16, color: colors.text, fontWeight: '600' },
});
