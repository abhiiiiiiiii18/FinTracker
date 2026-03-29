import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, User, ArrowRight, TrendingUp } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';

const theme = {
  background: '#0F172A',
  card: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  primary: '#3B82F6',
  accent: '#10B981',
  danger: '#EF4444',
  border: '#334155',
  inputBg: '#0A1628',
};

export default function SignupScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSignup = async () => {
    if (!fullName.trim()) { Alert.alert('Missing', 'Please enter your full name.'); return; }
    if (!email.trim()) { Alert.alert('Missing', 'Please enter your email.'); return; }
    if (password.length < 6) { Alert.alert('Weak Password', 'Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { Alert.alert('Mismatch', 'Passwords do not match.'); return; }

    const error = await signUp(email.trim(), password, fullName.trim());
    if (error) {
      Alert.alert('Sign Up Failed', error);
      return;
    }

    Alert.alert(
      '✅ Almost there!',
      'We sent a confirmation email to ' + email + '. Please verify your email then log in.',
      [{ text: 'Go to Login', onPress: () => router.replace('/auth/login') }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoIcon}>
              <TrendingUp color={theme.primary} size={32} />
            </View>
            <Text style={styles.appName}>FinTracker</Text>
            <Text style={styles.tagline}>Track together. Split fairly.</Text>
          </View>

          <Text style={styles.title}>Create Account</Text>

          {/* Full Name */}
          <View style={styles.inputWrapper}>
            <User color={theme.textSecondary} size={18} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor={theme.textSecondary}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Mail color={theme.textSecondary} size={18} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <View style={styles.inputWrapper}>
            <Lock color={theme.textSecondary} size={18} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password (min. 6 chars)"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="next"
            />
          </View>

          {/* Confirm Password */}
          <View style={styles.inputWrapper}>
            <Lock color={theme.textSecondary} size={18} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor={theme.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSignup}
            />
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleSignup} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Create Account</Text>
                <ArrowRight color="#fff" size={20} />
              </>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/auth/login')}>
              <Text style={styles.switchLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 24, paddingTop: 48, paddingBottom: 60 },
  logoWrapper: { alignItems: 'center', marginBottom: 40 },
  logoIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#1D3461', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 10,
  },
  appName: { fontSize: 28, fontWeight: '900', color: theme.text, letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: theme.textSecondary, marginTop: 4 },
  title: { fontSize: 22, fontWeight: '800', color: theme.text, marginBottom: 24 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.inputBg, borderRadius: 14,
    borderWidth: 1, borderColor: theme.border,
    paddingHorizontal: 14, marginBottom: 14,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: theme.text, fontSize: 15, paddingVertical: 16 },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: theme.primary, borderRadius: 16,
    paddingVertical: 16, gap: 8, marginTop: 8,
    shadowColor: theme.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4, shadowRadius: 16, elevation: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: theme.textSecondary, fontSize: 14 },
  switchLink: { color: theme.primary, fontSize: 14, fontWeight: '700' },
});
