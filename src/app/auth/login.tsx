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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, ArrowRight, TrendingUp } from 'lucide-react-native';
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

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) { Alert.alert('Missing', 'Please enter your email.'); return; }
    if (!password) { Alert.alert('Missing', 'Please enter your password.'); return; }

    const error = await signIn(email.trim(), password);
    if (error) {
      Alert.alert('Login Failed', error);
    }
    // On success, the auth listener in _layout.tsx will auto-redirect to the app
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center' }}
      >
        <View style={styles.content}>
          {/* Logo */}
          <View style={styles.logoWrapper}>
            <View style={styles.logoIcon}>
              <TrendingUp color={theme.primary} size={32} />
            </View>
            <Text style={styles.appName}>FinTracker</Text>
            <Text style={styles.tagline}>Track together. Split fairly.</Text>
          </View>

          <Text style={styles.title}>Welcome Back</Text>

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
              placeholder="Password"
              placeholderTextColor={theme.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          {/* Login Button */}
          <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Log In</Text>
                <ArrowRight color="#fff" size={20} />
              </>
            )}
          </TouchableOpacity>

          {/* Signup Link */}
          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/auth/signup')}>
              <Text style={styles.switchLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  content: { padding: 24 },
  logoWrapper: { alignItems: 'center', marginBottom: 48 },
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
