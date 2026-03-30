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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Users, Plus, Trash2, ChevronRight, X, UserPlus, BookUser } from 'lucide-react-native';
import * as Contacts from 'expo-contacts';
import { useSplitStore, computeNetBalances, simplifyDebts, GroupInvitation } from '../store/useSplitStore';
import type { Group } from '../store/useSplitStore';

const theme = {
  background: '#0F172A',
  card: '#1E293B',
  cardAlt: '#162032',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#3B82F6',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  border: '#334155',
  inputBg: '#0F172A',
};

// ─── Group list item ──────────────────────────────────────────────────────────

function GroupCard({ group, onPress, onDelete }: { group: Group; onPress: () => void; onDelete: () => void }) {
  const debts = simplifyDebts(computeNetBalances(group.expenses));
  const totalOwed = debts.reduce((s, d) => s + d.amount, 0);

  return (
    <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.groupIcon}>
        <Users color={theme.primary} size={22} />
      </View>
      <View style={styles.groupInfo}>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.groupMeta}>
          {group.members.length} members · {group.expenses.length} expenses
        </Text>
        {totalOwed > 0 && (
          <Text style={styles.groupDebt}>₹{totalOwed.toFixed(0)} unsettled</Text>
        )}
        {totalOwed === 0 && group.expenses.length > 0 && (
          <Text style={styles.groupSettled}>✓ All settled</Text>
        )}
      </View>
      <View style={styles.groupActions}>
        <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Trash2 color={theme.danger} size={16} />
        </TouchableOpacity>
        <ChevronRight color={theme.textSecondary} size={20} />
      </View>
    </TouchableOpacity>
  );
}

// ─── New Group Modal ──────────────────────────────────────────────────────────

function NewGroupModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const createGroup = useSplitStore((s) => s.createGroup);
  const [name, setName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

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

  const pickFromContacts = async () => {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Allow contacts access to pick friends easily.');
      return;
    }

    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return;

    const name = contact.name?.trim() ||
      [contact.firstName, contact.lastName].filter(Boolean).join(' ');

    if (!name) {
      Alert.alert('No Name', 'This contact has no name saved.');
      return;
    }

    if (members.includes(name)) {
      Alert.alert('Already added', `${name} is already in the group.`);
      return;
    }

    setMembers((prev) => [...prev, name]);
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

  const reset = () => { setName(''); setMemberInput(''); setMembers([]); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={reset}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Group</Text>
            <TouchableOpacity onPress={reset}><X color={theme.textSecondary} size={22} /></TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Goa Trip, Flatmates"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.inputLabel}>Add Members</Text>
          <View style={styles.memberInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Enter name"
              placeholderTextColor={theme.textSecondary}
              value={memberInput}
              onChangeText={setMemberInput}
              onSubmitEditing={addMember}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.addMemberBtn} onPress={addMember}>
              <UserPlus color={theme.primary} size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addMemberBtn, { backgroundColor: '#1A3D2B' }]} onPress={pickFromContacts}>
              <BookUser color={theme.accent} size={20} />
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
                  <X color={theme.textSecondary} size={12} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          <Text style={styles.hintText}>Tap a name to remove it</Text>

          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create Group</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
          <Plus color="#fff" size={20} />
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
        <ActivityIndicator color={theme.primary} style={{ marginTop: 60 }} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Users color={theme.border} size={56} />
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
  container: { flex: 1, backgroundColor: theme.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '900', color: theme.text },
  newGroupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  newGroupBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1D3461',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 17, fontWeight: '700', color: theme.text, marginBottom: 3 },
  groupMeta: { fontSize: 12, color: theme.textSecondary },
  groupDebt: { fontSize: 12, color: theme.warning, marginTop: 4, fontWeight: '600' },
  groupSettled: { fontSize: 12, color: theme.accent, marginTop: 4, fontWeight: '600' },
  groupActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deleteBtn: { padding: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: theme.text, marginTop: 20 },
  emptySubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: theme.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: theme.text },
  inputLabel: { fontSize: 13, fontWeight: '600', color: theme.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: theme.inputBg,
    borderRadius: 12,
    padding: 14,
    color: theme.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  memberInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  addMemberBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1D3461',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  chipText: { color: theme.primary, fontSize: 13, fontWeight: '600' },
  hintText: { fontSize: 11, color: theme.textSecondary, marginBottom: 24 },
  createBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  createBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  // Invite banner
  inviteBanner: {
    marginHorizontal: 20, marginBottom: 12, backgroundColor: '#1A2F1A',
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.accent,
  },
  inviteBannerTitle: { color: theme.accent, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  inviteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  inviteText: { color: theme.text, fontSize: 13 },
  inviteAccept: { color: theme.accent, fontWeight: '700', fontSize: 13 },
});
