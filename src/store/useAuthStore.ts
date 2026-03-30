import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "../lib/supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  initialized: boolean;
  signUp: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

let authListener: {
  data: { subscription: { unsubscribe: () => void } };
} | null = null;

// Cleanup function to unsubscribe from auth listener
export const cleanupAuthListener = () => {
  if (authListener) {
    authListener.data.subscription.unsubscribe();
    authListener = null;
  }
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  session: null,
  isLoading: false,
  initialized: false,

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    set({ session, user: session?.user ?? null, initialized: true });

    // Only set up listener once - prevents memory leak from multiple listeners
    if (!authListener) {
      authListener = supabase.auth.onAuthStateChange((_event, session) => {
        set({ session, user: session?.user ?? null });
      });
    }
  },

  signUp: async (email, password, fullName) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    set({ isLoading: false });
    if (error) return error.message;
    return null;
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    set({ isLoading: false });
    if (error) return error.message;
    return null;
  },

  signOut: async () => {
    cleanupAuthListener();
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },
}));
