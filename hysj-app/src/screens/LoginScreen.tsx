import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Modal, FlatList, Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { login } from '../services/api';
import { saveSession } from '../services/auth';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Login'> };

const COUNTRIES = [
  { code: 'NO', flag: '\u{1F1F3}\u{1F1F4}', name: 'Norway', dial: '47' },
  { code: 'US', flag: '\u{1F1FA}\u{1F1F8}', name: 'United States', dial: '1' },
  { code: 'GB', flag: '\u{1F1EC}\u{1F1E7}', name: 'United Kingdom', dial: '44' },
  { code: 'SE', flag: '\u{1F1F8}\u{1F1EA}', name: 'Sweden', dial: '46' },
  { code: 'DK', flag: '\u{1F1E9}\u{1F1F0}', name: 'Denmark', dial: '45' },
  { code: 'FI', flag: '\u{1F1EB}\u{1F1EE}', name: 'Finland', dial: '358' },
  { code: 'DE', flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany', dial: '49' },
  { code: 'FR', flag: '\u{1F1EB}\u{1F1F7}', name: 'France', dial: '33' },
  { code: 'ES', flag: '\u{1F1EA}\u{1F1F8}', name: 'Spain', dial: '34' },
  { code: 'IT', flag: '\u{1F1EE}\u{1F1F9}', name: 'Italy', dial: '39' },
  { code: 'NL', flag: '\u{1F1F3}\u{1F1F1}', name: 'Netherlands', dial: '31' },
  { code: 'PL', flag: '\u{1F1F5}\u{1F1F1}', name: 'Poland', dial: '48' },
  { code: 'RU', flag: '\u{1F1F7}\u{1F1FA}', name: 'Russia', dial: '7' },
  { code: 'TR', flag: '\u{1F1F9}\u{1F1F7}', name: 'Turkey', dial: '90' },
  { code: 'IN', flag: '\u{1F1EE}\u{1F1F3}', name: 'India', dial: '91' },
  { code: 'CN', flag: '\u{1F1E8}\u{1F1F3}', name: 'China', dial: '86' },
  { code: 'JP', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japan', dial: '81' },
  { code: 'KR', flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korea', dial: '82' },
  { code: 'BR', flag: '\u{1F1E7}\u{1F1F7}', name: 'Brazil', dial: '55' },
  { code: 'MX', flag: '\u{1F1F2}\u{1F1FD}', name: 'Mexico', dial: '52' },
  { code: 'AU', flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia', dial: '61' },
  { code: 'CA', flag: '\u{1F1E8}\u{1F1E6}', name: 'Canada', dial: '1' },
  { code: 'CH', flag: '\u{1F1E8}\u{1F1ED}', name: 'Switzerland', dial: '41' },
  { code: 'AT', flag: '\u{1F1E6}\u{1F1F9}', name: 'Austria', dial: '43' },
  { code: 'BE', flag: '\u{1F1E7}\u{1F1EA}', name: 'Belgium', dial: '32' },
  { code: 'PT', flag: '\u{1F1F5}\u{1F1F9}', name: 'Portugal', dial: '351' },
  { code: 'GR', flag: '\u{1F1EC}\u{1F1F7}', name: 'Greece', dial: '30' },
  { code: 'PK', flag: '\u{1F1F5}\u{1F1F0}', name: 'Pakistan', dial: '92' },
  { code: 'NG', flag: '\u{1F1F3}\u{1F1EC}', name: 'Nigeria', dial: '234' },
  { code: 'ZA', flag: '\u{1F1FF}\u{1F1E6}', name: 'South Africa', dial: '27' },
  { code: 'EG', flag: '\u{1F1EA}\u{1F1EC}', name: 'Egypt', dial: '20' },
  { code: 'SA', flag: '\u{1F1F8}\u{1F1E6}', name: 'Saudi Arabia', dial: '966' },
  { code: 'AE', flag: '\u{1F1E6}\u{1F1EA}', name: 'UAE', dial: '971' },
  { code: 'IL', flag: '\u{1F1EE}\u{1F1F1}', name: 'Israel', dial: '972' },
  { code: 'UA', flag: '\u{1F1FA}\u{1F1E6}', name: 'Ukraine', dial: '380' },
  { code: 'AR', flag: '\u{1F1E6}\u{1F1F7}', name: 'Argentina', dial: '54' },
  { code: 'CO', flag: '\u{1F1E8}\u{1F1F4}', name: 'Colombia', dial: '57' },
  { code: 'CL', flag: '\u{1F1E8}\u{1F1F1}', name: 'Chile', dial: '56' },
  { code: 'PH', flag: '\u{1F1F5}\u{1F1ED}', name: 'Philippines', dial: '63' },
  { code: 'ID', flag: '\u{1F1EE}\u{1F1E9}', name: 'Indonesia', dial: '62' },
  { code: 'MY', flag: '\u{1F1F2}\u{1F1FE}', name: 'Malaysia', dial: '60' },
  { code: 'SG', flag: '\u{1F1F8}\u{1F1EC}', name: 'Singapore', dial: '65' },
  { code: 'TH', flag: '\u{1F1F9}\u{1F1ED}', name: 'Thailand', dial: '66' },
  { code: 'VN', flag: '\u{1F1FB}\u{1F1F3}', name: 'Vietnam', dial: '84' },
  { code: 'NZ', flag: '\u{1F1F3}\u{1F1FF}', name: 'New Zealand', dial: '64' },
  { code: 'IE', flag: '\u{1F1EE}\u{1F1EA}', name: 'Ireland', dial: '353' },
  { code: 'CZ', flag: '\u{1F1E8}\u{1F1FF}', name: 'Czech Republic', dial: '420' },
  { code: 'HU', flag: '\u{1F1ED}\u{1F1FA}', name: 'Hungary', dial: '36' },
  { code: 'RO', flag: '\u{1F1F7}\u{1F1F4}', name: 'Romania', dial: '40' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function LoginScreen({ navigation }: Props) {
  const [phone, setPhone]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [country, setCountry]       = useState(COUNTRIES.find(c => c.code === 'NO')!);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch]         = useState('');
  const [error, setError]           = useState('');
  const [busy, setBusy]             = useState(false);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  );

  const openModal = () => setPickerOpen(true);

  const closeModal = () => {
    setPickerOpen(false);
    setSearch('');
  };

  const handleLogin = async () => {
    if (!phone.trim() || !password) { setError('Phone number and password are required'); return; }
    setBusy(true);
    setError('');
    try {
      const fullNumber = `+${country.dial}${phone.replace(/\s/g, '')}`;
      const res = await login({ phoneNumber: fullNumber, password, totpCode: null });
      await saveSession({
        token: res.data.token,
        refreshToken: res.data.refreshToken,
        userId: res.data.userId,
        deviceId: res.data.deviceId,
        username: fullNumber,
        expiresAt: res.data.expiresAt,
      });
      navigation.replace('ConversationList');
    } catch (e: any) {
      if (e.response) {
        const status = e.response.status;
        if (status === 401) {
          setError('Invalid phone number or password');
        } else if (status === 429) {
          const retryAfter = e.response.headers?.['retry-after'];
          const mins = retryAfter ? Math.ceil(Number(retryAfter) / 60) : 15;
          setError(`Too many attempts. Please try again in ${mins} minutes`);
        } else if (status >= 500) {
          setError('Server error. Please try again later');
        } else {
          setError('Something went wrong. Please try again');
        }
      } else if (e.code === 'ECONNABORTED') {
        setError('Connection timed out. Check your internet');
      } else if (!e.response && e.request) {
        setError('No internet connection');
      } else {
        setError('Something went wrong. Please try again');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoBg}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>hysj</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>Your privacy, redefined</Text>

        {/* Form */}
        <View style={styles.form}>
          {/* Phone label */}
          <Text style={styles.inputLabel}>Phone number</Text>

          {/* Phone row */}
          <View style={styles.phoneRow}>
            <TouchableOpacity
              style={styles.countryBtn}
              onPress={openModal}
              activeOpacity={0.7}
              accessibilityLabel={`Select country, currently ${country.name} +${country.dial}`}
              accessibilityRole="button"
            >
              <Text style={styles.flag}>{country.flag}</Text>
              <Text style={styles.dialCode}>+{country.dial}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>

            <TextInput
              style={styles.phoneInput}
              placeholder="Phone number"
              placeholderTextColor={colors.textDim}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
              accessibilityLabel="Phone number"
            />
          </View>

          {/* Password label */}
          <Text style={styles.inputLabel}>Password</Text>

          {/* Password */}
          <View style={styles.passwordWrap}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor={colors.textDim}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              accessibilityLabel="Password"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.6}
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {!!error && (
            <View style={styles.errorRow} accessible={true} accessibilityRole="alert" accessibilityLabel={error}>
              <View style={styles.errorIconWrap}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
              </View>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Sign In button */}
          <TouchableOpacity
            style={[styles.signInBtn, busy && styles.signInBtnDisabled]}
            onPress={handleLogin}
            disabled={busy}
            activeOpacity={0.8}
            accessibilityLabel={busy ? 'Signing in' : 'Sign in'}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
          >
            {busy
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.signInText}>Sign In</Text>}
          </TouchableOpacity>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
              <Text style={styles.registerLink}> Create one</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerBadge}>
            <Ionicons name="shield-checkmark" size={14} color={colors.shield} />
            <Text style={styles.footerText}>End-to-end encrypted</Text>
          </View>
        </View>
      </ScrollView>

      {/* Country picker modal */}
      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={closeModal}
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Country</Text>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={item => item.code}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    item.code === country.code && styles.countryItemActive,
                  ]}
                  onPress={() => {
                    setCountry(item);
                    closeModal();
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryDial}>+{item.dial}</Text>
                  {item.code === country.code && (
                    <Ionicons name="checkmark" size={18} color={colors.purple} />
                  )}
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={closeModal}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const INPUT_HEIGHT = 52;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 90,
    paddingBottom: spacing.xl,
  },

  /* Logo */
  logoWrap: {
    marginBottom: spacing.lg,
  },
  logoBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle glow ring
    borderWidth: 1,
    borderColor: `${colors.purple}33`,
  },
  logoImage: {
    width: 54,
    height: 54,
  },

  /* Title */
  title: {
    fontSize: 42,
    fontWeight: font.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 3,
    marginBottom: 6,
  },

  /* Subtitle */
  subtitle: {
    fontSize: font.sizes.sm,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 52,
  },

  /* Form */
  form: {
    width: '100%',
    maxWidth: 400,
  },

  /* Input labels */
  inputLabel: {
    color: colors.textSecondary,
    fontSize: font.sizes.xs,
    fontWeight: font.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },

  /* Phone row */
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.lg,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    height: INPUT_HEIGHT,
    paddingHorizontal: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderMid,
  },
  flag: {
    fontSize: 20,
  },
  dialCode: {
    color: colors.textPrimary,
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    height: INPUT_HEIGHT,
    paddingHorizontal: 18,
    color: colors.textPrimary,
    fontSize: font.sizes.md,
    borderWidth: 1,
    borderColor: colors.borderMid,
  },

  /* Password input */
  passwordWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.md,
    height: INPUT_HEIGHT,
    borderWidth: 1,
    borderColor: colors.borderMid,
    marginBottom: spacing.lg,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 18,
    color: colors.textPrimary,
    fontSize: font.sizes.md,
    height: '100%',
  },
  eyeBtn: {
    paddingHorizontal: 14,
    height: '100%',
    justifyContent: 'center',
  },

  /* Error */
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
    backgroundColor: colors.dangerBg,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
  },
  errorIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,59,48,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.danger,
    fontSize: font.sizes.sm,
    flex: 1,
    fontWeight: font.weights.medium,
  },

  /* Sign In button */
  signInBtn: {
    width: '100%',
    height: 54,
    borderRadius: radius.md,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  signInBtnDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  signInText: {
    color: colors.white,
    fontSize: font.sizes.lg,
    fontWeight: font.weights.bold,
    letterSpacing: 0.5,
  },

  /* Register */
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    color: colors.textSecondary,
    fontSize: font.sizes.sm,
  },
  registerLink: {
    color: colors.purpleLight,
    fontSize: font.sizes.sm,
    fontWeight: font.weights.bold,
  },

  /* Footer */
  footer: {
    alignItems: 'center',
    marginTop: 'auto' as any,
    paddingTop: spacing.xl,
  },
  footerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.green}14`,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.full,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: font.sizes.xs,
    fontWeight: font.weights.medium,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.md + 4,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '75%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: spacing.md,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: font.sizes.lg + 1,
    fontWeight: font.weights.bold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: 14,
    fontSize: font.sizes.md,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  countryItemActive: {
    backgroundColor: `${colors.purple}1A`,
    borderRadius: radius.md,
  },
  countryFlag: {
    fontSize: 22,
  },
  countryName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: font.sizes.md,
  },
  countryDial: {
    color: colors.textMuted,
    fontSize: font.sizes.sm,
    marginRight: 4,
  },
  cancelBtn: {
    marginTop: 12,
    borderRadius: radius.pill,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: font.sizes.md + 1,
    fontWeight: font.weights.semibold,
  },
});
