import type { RealtimeChannel } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { sendExpenseNotification } from "../services/notificationService";

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
  split_type: "equal" | "custom";
  splits: SplitShare[];
  created_at: string;
}

export interface GroupMember {
  id: string;
  name: string;
  user_id?: string;
  email?: string;
  status: "active" | "pending";
}

export interface GroupInvitation {
  id: string;
  group_id: string;
  invited_email: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_at: string;
  created_by?: string;
  members: GroupMember[];
  expenses: GroupExpense[];
  invitations: GroupInvitation[];
}

export interface DebtStatement {
  from: string;
  to: string;
  amount: number;
}

// ─── Balance helpers ──────────────────────────────────────────────────────────

export function computeNetBalances(
  expenses: GroupExpense[],
): Record<string, number> {
  const balances: Record<string, number> = {};
  for (const exp of expenses) {
    balances[exp.paid_by] = (balances[exp.paid_by] || 0) + exp.total_amount;
    for (const share of exp.splits) {
      balances[share.name] = (balances[share.name] || 0) - share.amount;
    }
  }
  return balances;
}

export function simplifyDebts(
  balances: Record<string, number>,
): DebtStatement[] {
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  for (const [name, bal] of Object.entries(balances)) {
    if (bal > 0.01) creditors.push({ name, amount: bal });
    else if (bal < -0.01) debtors.push({ name, amount: -bal });
  }

  const statements: DebtStatement[] = [];
  let i = 0,
    j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settled = Math.min(debtor.amount, creditor.amount);
    statements.push({
      from: debtor.name,
      to: creditor.name,
      amount: Math.round(settled * 100) / 100,
    });
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
  pendingInvitations: GroupInvitation[];
  isLoaded: boolean;
  activeChannels: Record<string, RealtimeChannel>;

  fetchGroups: () => Promise<void>;
  createGroup: (
    name: string,
    members: { name: string }[],
  ) => Promise<Group | null>;
  addExpense: (
    groupId: string,
    expense: Omit<GroupExpense, "id" | "group_id" | "created_at">,
  ) => Promise<void>;
  settleDebt: (
    groupId: string,
    from: string,
    to: string,
    amount: number,
  ) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
  inviteMember: (
    groupId: string,
    email: string,
    displayName: string,
  ) => Promise<string | null>;
  acceptInvitation: (invitationId: string, groupId: string) => Promise<void>;
  subscribeToGroup: (groupId: string) => void;
  unsubscribeFromGroup: (groupId: string) => void;
  fetchPendingInvitations: () => Promise<void>;
}

export const useSplitStore = create<SplitState>()((set, get) => ({
  groups: [],
  pendingInvitations: [],
  isLoaded: false,
  activeChannels: {},

  fetchGroups: async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch groups created by or member of
      const { data: groupsData, error: gErr } = await supabase
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false });

      if (gErr) throw gErr;
      if (!groupsData || groupsData.length === 0) {
        set({ groups: [], isLoaded: true });
        return;
      }

      const groupIds = groupsData.map((g: any) => g.id);

      const [membersRes, expensesRes, invitationsRes] = await Promise.all([
        supabase.from("group_members").select("*").in("group_id", groupIds),
        supabase
          .from("group_expenses")
          .select("*")
          .in("group_id", groupIds)
          .order("created_at", { ascending: true }),
        supabase.from("group_invitations").select("*").in("group_id", groupIds),
      ]);

      const groups: Group[] = groupsData.map((g: any) => ({
        id: g.id,
        name: g.name,
        created_at: g.created_at,
        created_by: g.created_by,
        members: (membersRes.data || [])
          .filter((m: any) => m.group_id === g.id)
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            user_id: m.user_id,
            email: m.email,
            status: m.status || "active",
          })),
        expenses: (expensesRes.data || [])
          .filter((e: any) => e.group_id === g.id)
          .map((e: any) => ({ ...e, splits: e.splits as SplitShare[] })),
        invitations: (invitationsRes.data || []).filter(
          (i: any) => i.group_id === g.id,
        ),
      }));

      set({ groups, isLoaded: true });

      // Subscribe to real-time for all groups
      groupIds.forEach((id: string) => get().subscribeToGroup(id));
    } catch (err) {
      console.error("Failed to fetch groups:", err);
      set({ isLoaded: true });
    }
  },

  createGroup: async (name, members) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: groupData, error: gErr } = await supabase
      .from("groups")
      .insert([{ name, created_by: user.id }])
      .select()
      .single();

    if (gErr || !groupData) {
      console.error("Failed to create group:", gErr);
      return null;
    }

    // Current user is always a member
    const memberRows = members.map((m) => ({
      group_id: groupData.id,
      name: m.name,
      status: "active",
    }));

    const { data: membersData, error: mErr } = await supabase
      .from("group_members")
      .insert(memberRows)
      .select();

    if (mErr) console.error("Failed to insert members:", mErr);

    const newGroup: Group = {
      id: groupData.id,
      name: groupData.name,
      created_at: groupData.created_at,
      created_by: groupData.created_by,
      members: (membersData || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        user_id: m.user_id,
        email: m.email,
        status: m.status || "active",
      })),
      expenses: [],
      invitations: [],
    };

    set((state) => ({ groups: [newGroup, ...state.groups] }));
    get().subscribeToGroup(newGroup.id);
    return newGroup;
  },

  addExpense: async (groupId, expense) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from("group_expenses")
      .insert([{ ...expense, group_id: groupId }])
      .select()
      .single();

    if (error || !data) {
      console.error("Failed to add expense:", error);
      return;
    }

    // Send push notifications to other group members
    if (user) {
      const group = get().groups.find((g) => g.id === groupId);
      const memberUserIds = (group?.members || [])
        .map((m) => m.user_id)
        .filter(Boolean) as string[];

      if (group && memberUserIds.length > 1) {
        sendExpenseNotification({
          groupName: group.name,
          description: expense.description,
          paidBy: expense.paid_by,
          amount: expense.total_amount,
          memberUserIds,
          currentUserId: user.id,
        });
      }
    }
    // Real-time subscription will update the state automatically
  },

  settleDebt: async (groupId, from, to, amount) => {
    await get().addExpense(groupId, {
      description: `✅ Settlement: ${from} → ${to}`,
      total_amount: amount,
      paid_by: to,
      split_type: "custom",
      splits: [{ name: from, amount }],
    });
  },

  deleteGroup: async (groupId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      console.error("Not logged in");
      return;
    }

    // Verify user is group owner before deletion
    const group = get().groups.find((g) => g.id === groupId);
    if (!group || group.created_by !== user.id) {
      console.error("Unauthorized: Only group creator can delete");
      return;
    }

    get().unsubscribeFromGroup(groupId);
    const { error } = await supabase.from("groups").delete().eq("id", groupId);
    if (error) {
      console.error("Failed to delete group:", error);
      return;
    }
    set((state) => ({ groups: state.groups.filter((g) => g.id !== groupId) }));
  },

  inviteMember: async (groupId, email, displayName) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "Not logged in";

    // Add as pending member
    const { error: memberErr } = await supabase.from("group_members").insert([
      {
        group_id: groupId,
        name: displayName,
        email,
        status: "pending",
      },
    ]);
    if (memberErr) return memberErr.message;

    // Create invitation record
    const { error: inviteErr } = await supabase
      .from("group_invitations")
      .insert([
        {
          group_id: groupId,
          invited_email: email,
          invited_by: user.id,
          status: "pending",
        },
      ]);
    if (inviteErr) return inviteErr.message;

    // Refresh group data
    await get().fetchGroups();
    return null;
  },

  acceptInvitation: async (invitationId, groupId) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Mark invitation accepted
    await supabase
      .from("group_invitations")
      .update({ status: "accepted" })
      .eq("id", invitationId);

    // Link the group_member row to this user account
    await supabase
      .from("group_members")
      .update({ user_id: user.id, status: "active" })
      .eq("group_id", groupId)
      .eq("email", user.email);

    await get().fetchGroups();
  },

  fetchPendingInvitations: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !user.email) return;

    const { data } = await supabase
      .from("group_invitations")
      .select("*")
      .eq("invited_email", user.email)
      .eq("status", "pending");

    set({ pendingInvitations: data || [] });
  },

  subscribeToGroup: (groupId) => {
    const existing = get().activeChannels[groupId];
    if (existing) return; // Already subscribed

    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_expenses",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const newExpense: GroupExpense = {
            ...(payload.new as any),
            splits: (payload.new as any).splits as SplitShare[],
          };
          set((state) => ({
            groups: state.groups.map((g) =>
              g.id === groupId
                ? { ...g, expenses: [...g.expenses, newExpense] }
                : g,
            ),
          }));
        },
      )
      .subscribe();

    set((state) => ({
      activeChannels: { ...state.activeChannels, [groupId]: channel },
    }));
  },

  unsubscribeFromGroup: (groupId) => {
    const channel = get().activeChannels[groupId];
    if (channel) {
      supabase.removeChannel(channel);
      set((state) => {
        const channels = { ...state.activeChannels };
        delete channels[groupId];
        return { activeChannels: channels };
      });
    }
  },
}));
