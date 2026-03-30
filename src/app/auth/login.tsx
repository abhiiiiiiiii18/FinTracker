import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, ArrowRight } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { colors, radius, shadow } from '../../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';

const { height: H } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const handleLogin = async () => {
    if (!email.trim()) { Alert.alert('Missing', 'Please enter your email.'); return; }
    if (!password) { Alert.alert('Missing', 'Please enter your password.'); return; }
    const error = await signIn(email.trim(), password);
    if (error) Alert.alert('Login Failed', error);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Ambient gradient background */}
      <LinearGradient
        colors={['#0D0520', '#06030F', '#060914']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      {/* Top orb decoration */}
      <View style={styles.orb1} />
      <View style={styles.orb2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <View style={styles.content}>

          {/* ── LOGO ───────────────────────────── */}
          <View style={styles.logoSection}>
            <LinearGradient
              colors={['#4C1D95', '#6D28D9', '#7C3AED']}
              style={styles.logoOrb}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoEmoji}>💸</Text>
            </LinearGradient>

            <View style={styles.glowRing} />

            <Text style={styles.appName}>FinTracker</Text>
            <Text style={styles.tagline}>Track. Split. Understand your money.</Text>
          </View>

          {/* ── CARD ───────────────────────────── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSub}>Sign in to your account</Text>

            {/* Email Input */}
            <View style={[styles.inputGroup, emailFocused && styles.inputGroupFocused]}>
              <Mail size={16} color={emailFocused ? colors.violet : colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.textFaint}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputGroup, passFocused && styles.inputGroupFocused]}>
              <Lock size={16} color={passFocused ? colors.violet : colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textFaint}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
              />
            </View>

            {/* CTA Button */}
            <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
              <LinearGradient
                colors={['#5B21B6', '#7C3AED', '#6D28D9']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.loginBtn}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.loginBtnText}>Sign In</Text>
                    <ArrowRight color="#fff" size={18} />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Sign up link */}
            <TouchableOpacity onPress={() => router.replace('/auth/signup')} style={styles.signupBtn}>
              <Text style={styles.signupText}>
                Don't have an account?{' '}
                <Text style={styles.signupLink}>Create one →</Text>
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },

  // ── Orbs
  orb1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(109, 40, 217, 0.18)',
    top: -80,
    right: -80,
  },
  orb2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    bottom: 80,
    left: -60,
  },

  content: { paddingHorizontal: 24 },

  // ── Logo
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoOrb: {
    width: 80,
    height: 80,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.violet,
  },
  glowRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    top: -10,
  },
  logoEmoji: { fontSize: 36 },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.text,
    marginTop: 16,
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },

  // ── Card
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.dark,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 24,
  },

  // ── Input
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 14,
  },
  inputGroupFocused: {
    borderColor: colors.violetDeep,
    backgroundColor: 'rgba(109, 40, 217, 0.06)',
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 16,
  },

  // ── Button
  loginBtn: {
    borderRadius: radius.pill,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    ...shadow.violet,
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },

  // ── Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.borderSubtle },
  dividerText: { fontSize: 12, color: colors.textFaint },

  // ── Sign up
  signupBtn: { alignItems: 'center' },
  signupText: { fontSize: 14, color: colors.textMuted },
  signupLink: { color: colors.violet, fontWeight: '700' },
});
