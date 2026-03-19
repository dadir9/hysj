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
import { register } from '../services/api';
import { generateRegistrationBundle } from '../services/keyManager';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Register'> };

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

export default function RegisterScreen({ navigation }: Props) {
  const [phone, setPhone]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [country, setCountry]               = useState(COUNTRIES.find(c => c.code === 'NO')!);
  const [pickerOpen, setPickerOpen]         = useState(false);
  const [search, setSearch]                 = useState('');
  const [error, setError]                   = useState('');
  const [busy, setBusy]                     = useState(false);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.dial.includes(search)
  );

  const openModal = () => setPickerOpen(true);

  const closeModal = () => {
    setPickerOpen(false);
    setSearch('');
  };

  const handleRegister = async () => {
    setError('');
    if (!phone.trim()) { setError('Phone number is required'); return; }
    if (!password) { setError('Password is required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    const fullNumber = `+${country.dial}${phone.replace(/\s/g, '')}`;
    setBusy(true);
    try {
      let bundle;
      try {
        bundle = await generateRegistrationBundle();
      } catch (keyErr: any) {
        const msg = keyErr?.message ?? '';
        if (msg.includes('Ed25519') || msg.includes('signing')) {
          setError('Failed to generate signing keys. Please restart the app and try again.');
        } else if (msg.includes('Kyber') || msg.includes('kyber') || msg.includes('ML-KEM')) {
          setError('Failed to generate post-quantum keys. Please restart the app and try again.');
        } else {
          setError('Failed to generate encryption keys. Please restart the app and try again.');
        }
        setBusy(false);
        return;
      }
      await register({
        username: fullNumber,
        phoneNumber: fullNumber,
        password,
        identityPublicKey: bundle.identityPublicKey,
        identityDhPublicKey: bundle.identityDhPublicKey,
        deviceName: 'Mobile',
        signedPreKey: bundle.signedPreKey,
        signedPreKeySig: bundle.signedPreKeySig,
        oneTimePreKeys: bundle.oneTimePreKeys,
        kyberPublicKey: bundle.kyberPublicKey,
      });
      navigation.replace('Login');
    } catch (e: any) {
      if (e.response) {
        const status = e.response.status;
        if (status === 409) {
          setError('Phone number already registered');
        } else if (status === 400) {
          setError('Invalid key bundle. Please restart and try again.');
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
        <Text style={styles.subtitle}>Create your account</Text>

        {/* Form */}
        <View style={styles.form}>
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

          {/* Password */}
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textDim}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="next"
            accessibilityLabel="Password"
          />

          {/* Confirm Password */}
          <TextInput
            style={styles.input}
            placeholder="Confirm password"
            placeholderTextColor={colors.textDim}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            accessibilityLabel="Confirm password"
          />

          {/* Password hint */}
          <Text style={styles.passwordHint}>Min. 8 characters</Text>

          {/* Error */}
          {!!error && (
            <View style={styles.errorRow} accessible={true} accessibilityRole="alert" accessibilityLabel={error}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Create Account button */}
          <TouchableOpacity
            style={[styles.signInBtn, busy && styles.signInBtnDisabled]}
            onPress={handleRegister}
            disabled={busy}
            activeOpacity={0.8}
            accessibilityLabel={busy ? 'Creating account' : 'Create account'}
            accessibilityRole="button"
            accessibilityState={{ disabled: busy }}
          >
            {busy
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.signInText}>Create Account</Text>}
          </TouchableOpacity>

          {/* Sign in link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Text style={styles.registerLink}> Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={12} color={colors.textMuted} />
          <Text style={styles.footerText}>Keys generated on-device only</Text>
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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2D2D3A',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 32,
  },

  /* Logo */
  logoWrap: {
    marginBottom: 24,
  },
  logoBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#353545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 52,
    height: 52,
  },

  /* Title */
  title: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
    marginBottom: 8,
  },

  /* Subtitle */
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 40,
  },

  /* Form */
  form: {
    width: '100%',
    maxWidth: 400,
  },

  /* Phone row */
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#353545',
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 14,
    gap: 6,
  },
  flag: {
    fontSize: 20,
  },
  dialCode: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    backgroundColor: '#353545',
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 18,
    color: '#FFFFFF',
    fontSize: 15,
  },

  /* Input fields */
  input: {
    width: '100%',
    backgroundColor: '#353545',
    borderRadius: 16,
    height: 54,
    paddingHorizontal: 18,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 14,
  },

  /* Password hint */
  passwordHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 4,
    marginTop: -6,
    marginBottom: 20,
  },

  /* Error */
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    flex: 1,
  },

  /* Create Account button */
  signInBtn: {
    width: '100%',
    height: 54,
    borderRadius: 28,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInBtnDisabled: {
    opacity: 0.5,
  },
  signInText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },

  /* Sign in link */
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: colors.purpleLight,
    fontSize: 14,
    fontWeight: '700',
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 'auto' as any,
    paddingTop: 32,
  },
  footerText: {
    color: colors.textMuted,
    fontSize: 12,
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
    backgroundColor: '#353545',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
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
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D3A',
    borderRadius: 14,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: 14,
    fontSize: 15,
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
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: 10,
  },
  countryFlag: {
    fontSize: 22,
  },
  countryName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  countryDial: {
    color: colors.textMuted,
    fontSize: 13,
    marginRight: 4,
  },
  cancelBtn: {
    marginTop: 12,
    borderRadius: 28,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2D2D3A',
  },
  cancelText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
});
