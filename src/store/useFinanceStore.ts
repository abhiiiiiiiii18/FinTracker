import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { fetchServiceSMS } from "../services/smsService";
import { parseFinanceSMS } from "../utils/smsParser";

export type TransactionCategory =
  | "Food"
  | "Transport"
  | "Entertainment"
  | "Bills"
  | "Other"
  | (string & {});

export interface Transaction {
  id: string;
  amount: number;
  category: TransactionCategory;
  date: string;
  note?: string;
  external_id?: string;
  type?: "Debit" | "Credit";
  merchant?: string;
  source?: "manual" | "sms";
  raw_sms?: string;
}

export interface Budget {
  totalLimit: number;
  categoryLimits: Partial<Record<TransactionCategory, number>>;
}

interface FinanceState {
  transactions: Transaction[];
  budget: Budget;
  isLoaded: boolean;
  initFetch: () => Promise<void>;
  addTransaction: (tx: Omit<Transaction, "id" | "date">) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  updateBudget: (budget: Budget) => Promise<void>;
  getInsights: () => string[];
  syncSMS: () => Promise<void>;
}

const GUEST_BUDGET_ID = "00000000-0000-0000-0000-000000000000";

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  transactions: [],
  isLoaded: false,
  budget: {
    totalLimit: 1000,
    categoryLimits: {
      Food: 300,
      Transport: 150,
      Entertainment: 100,
      Bills: 400,
      Other: 50,
    },
  },

  initFetch: async () => {
    try {
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: true });

      if (txError) throw txError;

      const { data: budgetData } = await supabase
        .from("budgets")
        .select("total_limit, category_limits")
        .limit(1)
        .single();

      let newBudget = get().budget;
      if (budgetData) {
        newBudget = {
          totalLimit: budgetData.total_limit,
          categoryLimits: budgetData.category_limits || {},
        };
      }

      set({
        transactions:
          txData?.map((tx) => ({
            ...tx,
            amount: Number(tx.amount),
          })) || [],
        budget: newBudget,
        isLoaded: true,
      });
    } catch (error) {
      console.error("Failed to fetch from Supabase:", error);
    }
  },

  addTransaction: async (tx) => {
    const tempTx: Transaction = {
      ...tx,
      id: Date.now().toString(),
      date: new Date().toISOString(),
    };

    set((state) => ({ transactions: [...state.transactions, tempTx] }));

    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          amount: tx.amount,
          category: tx.category,
          note: tx.note,
          date: tempTx.date,
          external_id: tx.external_id,
          type: tx.type,
          merchant: tx.merchant,
          source: tx.source || "manual",
          raw_sms: tx.raw_sms,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Failed to insert transaction:", error);
      return;
    }

    set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === tempTx.id ? { ...t, id: data.id } : t,
      ),
    }));
  },

  removeTransaction: async (id) => {
    set((state) => ({
      transactions: state.transactions.filter((tx) => tx.id !== id),
    }));

    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) console.error("Failed to delete transaction:", error);
  },

  updateBudget: async (budget) => {
    set({ budget });
    const { error } = await supabase.from("budgets").upsert(
      {
        id: GUEST_BUDGET_ID,
        total_limit: budget.totalLimit,
        category_limits: budget.categoryLimits,
      },
      { onConflict: "id" },
    );

    if (error) console.error("Failed to update budget in Supabase:", error);
  },

  syncSMS: async () => {
    try {
      const messages = await fetchServiceSMS();
      const localTransactions = [...get().transactions];

      // Create Set for O(1) lookup instead of O(n) with .some()
      const existingExternalIds = new Set(
        localTransactions.map((t) => t.external_id).filter(Boolean) as string[],
      );

      const txsToInsert: any[] = [];

      for (const msg of messages) {
        const parsed = parseFinanceSMS(msg.body, msg.address);
        if (!parsed) continue;

        // Deduplicate locally using externalId (UPI Ref) if it exists
        if (parsed.externalId && existingExternalIds.has(parsed.externalId)) {
          continue;
        }

        const newTx: Transaction = {
          id: "temp-" + Date.now().toString() + Math.random(),
          amount: parsed.amount,
          category: "Other", // Auto-categorization disabled for now
          date: new Date(msg.date).toISOString(),
          type: parsed.type,
          merchant: parsed.merchant,
          source: "sms",
          raw_sms: msg.body,
          external_id: parsed.externalId,
        };

        localTransactions.push(newTx);
        if (parsed.externalId) {
          existingExternalIds.add(parsed.externalId);
        }

        txsToInsert.push({
          amount: newTx.amount,
          category: newTx.category,
          date: newTx.date,
          type: newTx.type,
          merchant: newTx.merchant,
          source: newTx.source,
          raw_sms: newTx.raw_sms,
          external_id: newTx.external_id,
        });
      }

      // Optimistic UI Update so the user feels it's instant
      set({ transactions: localTransactions });

      if (txsToInsert.length > 0) {
        // Send bulk upsert to Supabase safely ignoring duplicates natively on unique constraints
        const { error } = await supabase
          .from("transactions")
          .upsert(txsToInsert, { onConflict: "external_id" });
        if (error) throw error;
      }
    } catch (err) {
      console.error("Sync failed:", err);
    }
  },

  getInsights: () => {
    const { transactions, budget } = get();
    const currentMonth = new Date().getMonth();
    const thisMonthTxs = transactions.filter(
      (t) => new Date(t.date).getMonth() === currentMonth,
    );

    const totalSpent = thisMonthTxs.reduce((sum, t) => sum + t.amount, 0);
    const insights: string[] = [];

    if (totalSpent > budget.totalLimit) {
      insights.push(
        "🚨 You have exceeded your overall budget limit for the month!",
      );
    } else if (totalSpent > budget.totalLimit * 0.8) {
      insights.push(
        "⚠️ You are nearing your total budget limit. Time to cut back on spending.",
      );
    }

    const categorySpending: Partial<Record<TransactionCategory, number>> = {};
    thisMonthTxs.forEach((t) => {
      categorySpending[t.category] =
        (categorySpending[t.category] || 0) + t.amount;
    });

    Object.entries(categorySpending).forEach(([cat, amount]) => {
      const limit = budget.categoryLimits[cat as TransactionCategory] || 0;
      if (limit > 0 && amount !== undefined && amount > limit) {
        insights.push(
          `💡 Suggestion: You overspent on ${cat}. Try cooking at home or finding free alternatives this week.`,
        );
      }
    });

    if (insights.length === 0) {
      insights.push(
        "⭐️ Great job! You are keeping your expenses well within limits.",
      );
    }

    return insights;
  },
}));
