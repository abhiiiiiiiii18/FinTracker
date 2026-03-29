import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SplitShare {
  name: string;
  amount: number;
}

export interface GroupExpense {
  id: string;
  group_id: string;
  description: string;
  total_amount: number;
  paid_by: string;
  split_type: 'equal' | 'custom';
  splits: SplitShare[];
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_at: string;
  members: string[]; // just names
  expenses: GroupExpense[];
}

/** A simplified "A owes B X" debt statement */
export interface DebtStatement {
  from: string;
  to: string;
  amount: number;
}

// ─── Balance calculation helpers ─────────────────────────────────────────────

/**
 * Given all expenses in a group, compute net balance per person.
 * Positive = owed money by others. Negative = owes others.
 */
export function computeNetBalances(expenses: GroupExpense[]): Record<string, number> {
  const balances: Record<string, number> = {};

  for (const exp of expenses) {
    // Payer gains full amount
    balances[exp.paid_by] = (balances[exp.paid_by] || 0) + exp.total_amount;
    // Each split member loses their share
    for (const share of exp.splits) {
      balances[share.name] = (balances[share.name] || 0) - share.amount;
    }
  }

  return balances;
}

/**
 * Simplify the balances into minimal "A owes B" statements.
 */
export function simplifyDebts(balances: Record<string, number>): DebtStatement[] {
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  for (const [name, bal] of Object.entries(balances)) {
    if (bal > 0.01) creditors.push({ name, amount: bal });
    else if (bal < -0.01) debtors.push({ name, amount: -bal });
  }

  const statements: DebtStatement[] = [];

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settled = Math.min(debtor.amount, creditor.amount);

    statements.push({ from: debtor.name, to: creditor.name, amount: Math.round(settled * 100) / 100 });

    debtor.amount -= settled;
    creditor.amount -= settled;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return statements;
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface SplitState {
  groups: Group[];
  isLoaded: boolean;
  fetchGroups: () => Promise<void>;
  createGroup: (name: string, members: string[]) => Promise<Group | null>;
  addExpense: (
    groupId: string,
    expense: Omit<GroupExpense, 'id' | 'group_id' | 'created_at'>
  ) => Promise<void>;
  settleDebt: (groupId: string, from: string, to: string, amount: number) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
}

export const useSplitStore = create<SplitState>()((set, get) => ({
  groups: [],
  isLoaded: false,

  fetchGroups: async () => {
    try {
      const { data: groupsData, error: gErr } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (gErr) throw gErr;
      if (!groupsData || groupsData.length === 0) {
        set({ groups: [], isLoaded: true });
        return;
      }

      const groupIds = groupsData.map((g: any) => g.id);

      const { data: membersData, error: mErr } = await supabase
        .from('group_members')
        .select('*')
        .in('group_id', groupIds);

      if (mErr) throw mErr;

      const { data: expensesData, error: eErr } = await supabase
        .from('group_expenses')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: true });

      if (eErr) throw eErr;

      const groups: Group[] = groupsData.map((g: any) => ({
        id: g.id,
        name: g.name,
        created_at: g.created_at,
        members: (membersData || [])
          .filter((m: any) => m.group_id === g.id)
          .map((m: any) => m.name),
        expenses: (expensesData || [])
          .filter((e: any) => e.group_id === g.id)
          .map((e: any) => ({
            ...e,
            splits: e.splits as SplitShare[],
          })),
      }));

      set({ groups, isLoaded: true });
    } catch (err) {
      console.error('Failed to fetch split groups:', err);
      set({ isLoaded: true });
    }
  },

  createGroup: async (name, members) => {
    const { data: groupData, error: gErr } = await supabase
      .from('groups')
      .insert([{ name }])
      .select()
      .single();

    if (gErr || !groupData) {
      console.error('Failed to create group:', gErr);
      return null;
    }

    const memberRows = members.map((m) => ({ group_id: groupData.id, name: m }));
    const { error: mErr } = await supabase.from('group_members').insert(memberRows);
    if (mErr) console.error('Failed to insert members:', mErr);

    const newGroup: Group = {
      id: groupData.id,
      name: groupData.name,
      created_at: groupData.created_at,
      members,
      expenses: [],
    };

    set((state) => ({ groups: [newGroup, ...state.groups] }));
    return newGroup;
  },

  addExpense: async (groupId, expense) => {
    const { data, error } = await supabase
      .from('group_expenses')
      .insert([{ ...expense, group_id: groupId }])
      .select()
      .single();

    if (error || !data) {
      console.error('Failed to add expense:', error);
      return;
    }

    const newExpense: GroupExpense = {
      ...data,
      splits: data.splits as SplitShare[],
    };

    set((state) => ({
      groups: state.groups.map((g) =>
        g.id === groupId
          ? { ...g, expenses: [...g.expenses, newExpense] }
          : g
      ),
    }));
  },

  settleDebt: async (groupId, from, to, amount) => {
    // Add a settlement expense: "to" paid "amount", split fully onto "from"
    await get().addExpense(groupId, {
      description: `Settlement: ${from} → ${to}`,
      total_amount: amount,
      paid_by: to,
      split_type: 'custom',
      splits: [{ name: from, amount }],
    });
  },

  deleteGroup: async (groupId) => {
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) {
      console.error('Failed to delete group:', error);
      return;
    }
    set((state) => ({ groups: state.groups.filter((g) => g.id !== groupId) }));
  },
}));
