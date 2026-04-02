import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import React, { useRef, useState } from "react";
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { CATEGORY_META, getCategoryMeta, colors, radius, shadow } from "../constants/theme";
import { TransactionCategory, useFinanceStore } from "../store/useFinanceStore";

const CATEGORIES: TransactionCategory[] = [
  "Food",
  "Transport",
  "Entertainment",
  "Bills",
  "Other",
];

export default function AddTransaction() {
  const router = useRouter();
  const { addTransaction, budget, transactions } = useFinanceStore();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<TransactionCategory>("Food");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustomCat, setIsCustomCat] = useState(false);
  const [note, setNote] = useState("");

  const btnScale = useRef(new Animated.Value(1)).current;

  const handleSave = async () => {
    // Validate amount
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount.");
      return;
    }

    const value = parseFloat(amount);

    // Validate amount is reasonable (not >1,000,000)
    if (value > 1000000) {
      Alert.alert("Invalid Amount", "Amount cannot exceed ₹10,00,000.");
      return;
    }

    // Validate note length
    if (note.trim().length > 200) {
      Alert.alert("Note Too Long", "Note must be less than 200 characters.");
      return;
    }

    const currentMonthIdx = new Date().getMonth();
    const thisMonthTxs = transactions.filter(
      (t) => new Date(t.date).getMonth() === currentMonthIdx,
    );
    const totalSpent = thisMonthTxs.reduce((sum, t) => sum + t.amount, 0);

    if (totalSpent + value > budget.totalLimit) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🚨 Budget Alert",
          body: "This transaction puts you over your monthly limit!",
          sound: true,
        },
        trigger: null,
      });
    }

    // Animate press
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }),
    ]).start(() => {
      addTransaction({
        amount: value,
        category: isCustomCat && customCategory.trim() ? customCategory.trim() : category,
        note: note.trim(),
        source: "manual",
      });
      router.push("/");
    });
  };

  const activeCat = isCustomCat && customCategory.trim() ? customCategory.trim() : category;
  const meta = getCategoryMeta(activeCat);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── HEADER ───────────────────────────── */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Expense</Text>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.closeBtn}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── AMOUNT ENTRY ─────────────────────── */}
          <View style={styles.amountSection}>
            <LinearGradient
              colors={[meta.bg, "transparent"]}
              style={styles.amountGlow}
            />
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.textFaint}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>

          {/* ── CATEGORY GRID ────────────────────── */}
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => {
              const catMeta = getCategoryMeta(cat);
              const isActive = !isCustomCat && category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => {
                    setIsCustomCat(false);
                    setCategory(cat);
                  }}
                  activeOpacity={0.7}
                  style={[
                    styles.categoryCard,
                    isActive && {
                      borderColor: catMeta.color,
                      backgroundColor: catMeta.bg,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.categoryEmojiBg,
                      {
                        backgroundColor: isActive
                          ? catMeta.color + "30"
                          : colors.bgCardAlt,
                      },
                    ]}
                  >
                    <Text style={styles.categoryEmoji}>{catMeta.emoji}</Text>
                  </View>
                  <Text
                    style={[
                      styles.categoryLabel,
                      isActive && { color: catMeta.color },
                    ]}
                  >
                    {catMeta.label}
                  </Text>
                  {isActive && (
                    <CheckCircle2
                      size={14}
                      color={catMeta.color}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Custom Category Selection */}
            <TouchableOpacity
              onPress={() => setIsCustomCat(true)}
              activeOpacity={0.7}
              style={[
                styles.categoryCard,
                isCustomCat && {
                  borderColor: colors.violet,
                  backgroundColor: colors.violetGlow,
                },
              ]}
            >
               <View
                style={[
                  styles.categoryEmojiBg,
                  {
                    backgroundColor: isCustomCat
                      ? colors.violet + "30"
                      : colors.bgCardAlt,
                  },
                ]}
              >
                <Text style={styles.categoryEmoji}>✨</Text>
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  isCustomCat && { color: colors.violet },
                ]}
              >
                Custom
              </Text>
              {isCustomCat && (
                <CheckCircle2
                  size={14}
                  color={colors.violet}
                  style={styles.checkIcon}
                />
              )}
            </TouchableOpacity>
          </View>

          {isCustomCat && (
             <View style={styles.noteWrapper}>
                <TextInput
                  style={[styles.noteInput, { minHeight: 50, marginBottom: 0 }]}
                  placeholder="Enter custom category name..."
                  placeholderTextColor={colors.textFaint}
                  value={customCategory}
                  onChangeText={setCustomCategory}
                  maxLength={15}
                />
             </View>
          )}

          {/* ── NOTE INPUT ───────────────────────── */}
          <Text style={styles.sectionLabel}>NOTE (OPTIONAL)</Text>
          <View style={styles.noteWrapper}>
            <TextInput
              style={styles.noteInput}
              placeholder="What was this for?"
              placeholderTextColor={colors.textFaint}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* ── SAVE BUTTON ──────────────────────── */}
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity onPress={handleSave} activeOpacity={0.85}>
              <LinearGradient
                colors={["#6D28D9", "#8B5CF6", "#7C3AED"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.saveBtn}
              >
                <Text style={styles.saveBtnText}>Save Expense</Text>
                <View style={styles.saveBtnBadge}>
                  <Text style={styles.saveBtnBadgeText}>
                    {amount ? `₹${parseFloat(amount || "0").toFixed(2)}` : "₹0"}
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: 24,
    paddingTop: 48,
    paddingBottom: 40,
  },

  // ── Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 36,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCard,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtnText: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Amount
  amountSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    position: "relative",
  },
  amountGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    top: -50,
    alignSelf: "center",
    opacity: 0.4,
  },
  currencySymbol: {
    fontSize: 52,
    fontWeight: "900",
    color: colors.violet,
    marginRight: 6,
    marginTop: 8,
  },
  amountInput: {
    fontSize: 72,
    fontWeight: "900",
    color: colors.text,
    letterSpacing: -2,
    minWidth: 140,
    textAlign: "center",
  },

  // ── Section Label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 14,
    marginTop: 4,
  },

  // ── Category Grid
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  categoryCard: {
    width: "30%",
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    padding: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    position: "relative",
  },
  categoryEmojiBg: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryEmoji: {
    fontSize: 22,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textAlign: "center",
  },
  checkIcon: {
    position: "absolute",
    top: 8,
    right: 8,
  },

  // ── Note Input
  noteWrapper: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 32,
    overflow: "hidden",
  },
  noteInput: {
    padding: 16,
    color: colors.text,
    fontSize: 15,
    minHeight: 90,
    textAlignVertical: "top",
    lineHeight: 22,
  },

  // ── Save Button
  saveBtn: {
    borderRadius: radius.pill,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    ...shadow.violet,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  saveBtnBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  saveBtnBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
