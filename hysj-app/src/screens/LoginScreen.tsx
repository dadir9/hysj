import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Modal, FlatList, Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { login } from '../services/api';
import { saveSession } from '../services/auth';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Login'> };

const COUNTRIES = [
  { code: 'NO', flag: '🇳🇴', name: 'Norway', dial: '47' },
  { code: 'US', flag: '🇺🇸', name: 'United States', dial: '1' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '44' },
  { code: 'SE', flag: '🇸🇪', name: 'Sweden', dial: '46' },
  { code: 'DK', flag: '🇩🇰', name: 'Denmark', dial: '45' },
  { code: 'FI', flag: '🇫🇮', name: 'Finland', dial: '358' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dial: '49' },
  { code: 'FR', flag: '🇫🇷', name: 'France', dial: '33' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain', dial: '34' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy', dial: '39' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', dial: '31' },
  { code: 'PL', flag: '🇵🇱', name: 'Poland', dial: '48' },
  { code: 'RU', flag: '🇷🇺', name: 'Russia', dial: '7' },
  { code: 'TR', flag: '🇹🇷', name: 'Turkey', dial: '90' },
  { code: 'IN', flag: '🇮🇳', name: 'India', dial: '91' },
  { code: 'CN', flag: '🇨🇳', name: 'China', dial: '86' },
  { code: 'JP', flag: '🇯🇵', name: 'Japan', dial: '81' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea', dial: '82' },
  { code: 'BR', flag: '🇧🇷', name: 'Brazil', dial: '55' },
  { code: 'MX', flag: '🇲🇽', name: 'Mexico', dial: '52' },
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dial: '61' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dial: '1' },
  { code: 'CH', flag: '🇨🇭', name: 'Switzerland', dial: '41' },
  { code: 'AT', flag: '🇦🇹', name: 'Austria', dial: '43' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgium', dial: '32' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', dial: '351' },
  { code: 'GR', flag: '🇬🇷', name: 'Greece', dial: '30' },
  { code: 'PK', flag: '🇵🇰', name: 'Pakistan', dial: '92' },
  { code: 'NG', flag: '🇳🇬', name: 'Nigeria', dial: '234' },
  { code: 'ZA', flag: '🇿🇦', name: 'South Africa', dial: '27' },
  { code: 'EG', flag: '🇪🇬', name: 'Egypt', dial: '20' },
  { code: 'SA', flag: '🇸🇦', name: 'Saudi Arabia', dial: '966' },
  { code: 'AE', flag: '🇦🇪', name: 'UAE', dial: '971' },
  { code: 'IL', flag: '🇮🇱', name: 'Israel', dial: '972' },
  { code: 'UA', flag: '🇺🇦', name: 'Ukraine', dial: '380' },
  { code: 'AR', flag: '🇦🇷', name: 'Argentina', dial: '54' },
  { code: 'CO', flag: '🇨🇴', name: 'Colombia', dial: '57' },
  { code: 'CL', flag: '🇨🇱', name: 'Chile', dial: '56' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines', dial: '63' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia', dial: '62' },
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia', dial: '60' },
  { code: 'SG', flag: '🇸🇬', name: 'Singapore', dial: '65' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand', dial: '66' },
  { code: 'VN', flag: '🇻🇳', name: 'Vietnam', dial: '84' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand', dial: '64' },
  { code: 'IE', flag: '🇮🇪', name: 'Ireland', dial: '353' },
  { code: 'CZ', flag: '🇨🇿', name: 'Czech Republic', dial: '420' },
  { code: 'HU', flag: '🇭🇺', name: 'Hungary', dial: '36' },
  { code: 'RO', flag: '🇷🇴', name: 'Romania', dial: '40' },
].sort((a, b) => a.name.localeCompare(b.name));

export default function LoginScreen({ navigation }: Props) {
  const [showFields, setShowFields]   = useState(false);
  const [phone, setPhone]             = useState('');
  const [password, setPassword]       = useState('');
  const [country, setCountry]         = useState(COUNTRIES.find(c => c.code === 'NO')!);
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [search, setSearch]           = useState('');
  const [error, setError]             = useState('');
  const [busy, setBusy]               = useState(false);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dial.includes(search)
  );

  const handleLogin = async () => {
    if (!phone.trim() || !password) { setError('Phone number and password are required'); return; }
    setBusy(true);
    setError('');
    try {
      const fullNumber = `+${country.dial}${phone.replace(/\s/g, '')}`;
      const res = await login({ phoneNumber: fullNumber, password, totpCode: null });
      await saveSession({
        token: res.data.token,
        userId: res.data.userId,
        deviceId: res.data.deviceId,
        username: fullNumber,
      });
      navigation.replace('ConversationList');
    } catch (e: any) {
      setError(e.response?.status === 401 ? 'Invalid credentials' : 'Connection error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
        <Text style={styles.title}>Welcome</Text>
        <Text style={styles.subtitle}>Your privacy, redefined</Text>

        {!showFields ? (
          <View style={styles.welcomeActions}>
            <TouchableOpacity style={styles.pillOutline} onPress={() => setShowFields(true)}>
              <Text style={styles.pillOutlineText}>Continue with Phone</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.fields}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <View style={styles.phoneRow}>
              <TouchableOpacity style={styles.countryBtn} onPress={() => setPickerOpen(true)}>
                <Text style={styles.flag}>{country.flag}</Text>
                <Text style={styles.callingCode}>+{country.dial}</Text>
              </TouchableOpacity>
              <View style={styles.phoneInputWrap}>
                <TextInput
                  style={styles.input}
                  placeholder="000 00 000"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>
            </View>

            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.pillOutline, busy && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.pillOutlineText}>Sign In</Text>}
            </TouchableOpacity>

            <View style={styles.registerRow}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Register</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.disclaimer}>
          By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy.
        </Text>
      </ScrollView>

      {/* Country picker modal */}
      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Country</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            <FlatList
              data={filtered}
              keyExtractor={item => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => {
                    setCountry(item);
                    setPickerOpen(false);
                    setSearch('');
                  }}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={styles.countryName}>{item.name}</Text>
                  <Text style={styles.countryDial}>+{item.dial}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => { setPickerOpen(false); setSearch(''); }}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 140,
    paddingBottom: spacing.xxl,
  },
  logoImage: { width: 80, height: 80, marginBottom: spacing.xxl },
  title: { fontSize: font.sizes.hero, fontWeight: font.weights.bold, color: colors.white, marginBottom: 10 },
  subtitle: { fontSize: font.sizes.md, color: colors.textSecondary, marginBottom: 60 },
  welcomeActions: { width: '100%', gap: 12 },
  pillOutline: {
    width: '100%', height: 56, borderRadius: radius.pill,
    borderWidth: 1.5, borderColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  pillOutlineText: { fontSize: font.sizes.lg, fontWeight: font.weights.semibold, color: colors.white },
  btnDisabled: { opacity: 0.7 },
  fields: { width: '100%' },
  label: { fontSize: font.sizes.xs, fontWeight: font.weights.bold, color: colors.textMuted, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  phoneRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  countryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgInput, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    height: 52, paddingHorizontal: 12, gap: 6,
  },
  flag: { fontSize: 22 },
  callingCode: { color: colors.textPrimary, fontSize: font.sizes.md, fontWeight: font.weights.semibold },
  phoneInputWrap: {
    flex: 1, backgroundColor: colors.bgInput, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, height: 52,
    justifyContent: 'center', paddingHorizontal: spacing.md,
  },
  inputWrap: {
    backgroundColor: colors.bgInput, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, height: 52,
    justifyContent: 'center', paddingHorizontal: spacing.md,
    marginBottom: 16,
  },
  input: { color: colors.textPrimary, fontSize: font.sizes.md },
  error: { color: colors.danger, fontSize: font.sizes.sm, marginBottom: spacing.md, marginLeft: 4 },
  registerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md },
  registerText: { color: colors.textSecondary, fontSize: font.sizes.sm },
  registerLink: { color: colors.purpleLight, fontSize: font.sizes.sm, fontWeight: font.weights.bold },
  disclaimer: { color: colors.textMuted, fontSize: 10, textAlign: 'center', marginTop: 48, lineHeight: 16 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, maxHeight: '80%',
  },
  modalTitle: { color: colors.white, fontSize: font.sizes.xl, fontWeight: font.weights.bold, marginBottom: spacing.md, textAlign: 'center' },
  searchInput: {
    backgroundColor: colors.bgInput, borderRadius: radius.lg, borderWidth: 1,
    borderColor: colors.border, color: colors.white, padding: 12,
    fontSize: font.sizes.md, marginBottom: spacing.md,
  },
  countryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 0.5, borderBottomColor: colors.border },
  countryName: { flex: 1, color: colors.textPrimary, fontSize: font.sizes.md },
  countryDial: { color: colors.textSecondary, fontSize: font.sizes.sm },
  closeBtn: {
    marginTop: spacing.md, backgroundColor: colors.bgInput, borderRadius: radius.pill,
    paddingVertical: 14, alignItems: 'center',
  },
  closeBtnText: { color: colors.white, fontSize: font.sizes.lg, fontWeight: font.weights.semibold },
});
