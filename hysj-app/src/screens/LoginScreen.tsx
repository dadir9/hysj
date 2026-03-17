import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, ActivityIndicator, Modal, FlatList, Image,
  Animated, Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { login } from '../services/api';
import { saveSession } from '../services/auth';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Login'> };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [showFields, setShowFields]   = useState(false);
  const [phone, setPhone]             = useState('');
  const [password, setPassword]       = useState('');
  const [country, setCountry]         = useState(COUNTRIES.find(c => c.code === 'NO')!);
  const [pickerOpen, setPickerOpen]   = useState(false);
  const [search, setSearch]           = useState('');
  const [error, setError]             = useState('');
  const [busy, setBusy]               = useState(false);

  // Animations
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(16)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(24)).current;
  const fieldsOpacity = useRef(new Animated.Value(0)).current;
  const fieldsTranslateY = useRef(new Animated.Value(20)).current;
  const modalOverlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(contentTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const animateShowFields = () => {
    setShowFields(true);
    fieldsOpacity.setValue(0);
    fieldsTranslateY.setValue(20);
    Animated.parallel([
      Animated.timing(fieldsOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(fieldsTranslateY, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  const openModal = () => {
    setPickerOpen(true);
    modalOverlayOpacity.setValue(0);
    Animated.timing(modalOverlayOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  };

  const closeModal = () => {
    Animated.timing(modalOverlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setPickerOpen(false);
      setSearch('');
    });
  };

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
        {/* Logo area with subtle gradient-like glow */}
        <Animated.View style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}>
          <View style={styles.logoGlowOuter} />
          <View style={styles.logoGlowInner} />
          <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
        </Animated.View>

        {/* Title */}
        <Animated.Text style={[
          styles.title,
          { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] },
        ]}>
          Welcome
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text style={[styles.subtitle, { opacity: subtitleOpacity }]}>
          Your privacy, redefined
        </Animated.Text>

        {/* Main content area */}
        <Animated.View style={[
          styles.contentArea,
          { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] },
        ]}>
          {!showFields ? (
            <View style={styles.welcomeActions}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={animateShowFields}
                activeOpacity={0.85}
              >
                <Ionicons name="call-outline" size={20} color={colors.white} style={styles.buttonIcon} />
                <Text style={styles.primaryButtonText}>Continue with Phone</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={[
              styles.fields,
              { opacity: fieldsOpacity, transform: [{ translateY: fieldsTranslateY }] },
            ]}>
              <Text style={styles.label}>PHONE NUMBER</Text>
              <View style={styles.phoneRow}>
                <TouchableOpacity style={styles.countryBtn} onPress={openModal} activeOpacity={0.7}>
                  <Text style={styles.flag}>{country.flag}</Text>
                  <Text style={styles.callingCode}>+{country.dial}</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                </TouchableOpacity>
                <View style={styles.phoneInputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="000 00 000"
                    placeholderTextColor={colors.textDim}
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
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.inputWithIcon]}
                  placeholder="Enter password"
                  placeholderTextColor={colors.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
              </View>

              {!!error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={colors.danger} />
                  <Text style={styles.error}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.primaryButton, busy && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={busy}
                activeOpacity={0.85}
              >
                {busy
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.primaryButtonText}>Sign In</Text>}
              </TouchableOpacity>

              <View style={styles.registerRow}>
                <Text style={styles.registerText}>Don't have an account?</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
                  <Text style={styles.registerLink}> Register</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.encryptedRow}>
            <Ionicons name="lock-closed" size={12} color={colors.shield} />
            <Text style={styles.encryptedText}>End-to-end encrypted</Text>
          </View>
          <View style={styles.disclaimerSeparator} />
          <Text style={styles.disclaimer}>
            By continuing, you agree to our{' '}
            <Text style={styles.disclaimerLink}>Terms of Service</Text>
            {'\n'}and{' '}
            <Text style={styles.disclaimerLink}>Privacy Policy</Text>
          </Text>
        </View>
      </ScrollView>

      {/* Country picker modal */}
      <Modal visible={pickerOpen} animationType="none" transparent>
        <Animated.View style={[styles.modalOverlay, { opacity: modalOverlayOpacity }]}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={closeModal} />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Country</Text>
            <View style={styles.searchInputWrap}>
              <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
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
                    <Ionicons name="checkmark-circle" size={20} color={colors.purple} />
                  )}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={closeModal} activeOpacity={0.85}>
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 100,
    paddingBottom: spacing.xxl,
    justifyContent: 'space-between',
  },

  /* ---- Logo area ---- */
  logoContainer: {
    width: 110,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  logoGlowOuter: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.purple,
    opacity: 0.08,
  },
  logoGlowInner: {
    position: 'absolute',
    width: 115,
    height: 115,
    borderRadius: 57.5,
    backgroundColor: colors.purple,
    opacity: 0.14,
  },
  logoImage: {
    width: 100,
    height: 100,
  },

  /* ---- Typography ---- */
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: font.sizes.lg,
    color: colors.textSecondary,
    letterSpacing: 0.3,
    marginBottom: 52,
  },

  /* ---- Content area ---- */
  contentArea: {
    width: '100%',
  },
  welcomeActions: {
    width: '100%',
    gap: 14,
  },

  /* ---- Primary filled button ---- */
  primaryButton: {
    width: '100%',
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.purple,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    fontSize: font.sizes.lg,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.2,
  },
  buttonIcon: {
    marginRight: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },

  /* ---- Fields ---- */
  fields: {
    width: '100%',
  },
  label: {
    fontSize: font.sizes.xs,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1.8,
    marginBottom: 10,
    marginLeft: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.purpleDark,
    height: 54,
    paddingHorizontal: 14,
    gap: 6,
  },
  flag: {
    fontSize: 22,
  },
  callingCode: {
    color: colors.textPrimary,
    fontSize: font.sizes.md,
    fontWeight: '600',
  },
  phoneInputWrap: {
    flex: 1,
    backgroundColor: colors.bgInput,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(124, 58, 237, 0.3)',
    height: 54,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(124, 58, 237, 0.3)',
    height: 54,
    paddingHorizontal: spacing.md,
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    color: colors.textPrimary,
    fontSize: font.sizes.md,
    flex: 1,
  },
  inputWithIcon: {
    flex: 1,
  },

  /* ---- Error ---- */
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    gap: 8,
  },
  error: {
    color: colors.danger,
    fontSize: font.sizes.sm,
    flex: 1,
  },

  /* ---- Register link ---- */
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  registerText: {
    color: colors.textSecondary,
    fontSize: font.sizes.md,
  },
  registerLink: {
    color: colors.purpleLight,
    fontSize: font.sizes.md,
    fontWeight: '700',
  },

  /* ---- Footer ---- */
  footer: {
    alignItems: 'center',
    marginTop: 48,
    paddingTop: 16,
  },
  encryptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  encryptedText: {
    color: colors.shield,
    fontSize: font.sizes.xs,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  disclaimerSeparator: {
    width: 32,
    height: 1,
    backgroundColor: colors.borderMid,
    marginBottom: 12,
  },
  disclaimer: {
    color: colors.textDim,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 18,
  },
  disclaimerLink: {
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },

  /* ---- Modal ---- */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
  },
  modalSheet: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderMid,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalTitle: {
    color: colors.white,
    fontSize: font.sizes.xl,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: spacing.md,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    paddingVertical: 14,
    fontSize: font.sizes.md,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderMid,
    borderRadius: radius.sm,
  },
  countryItemActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
  },
  countryFlag: {
    fontSize: 24,
  },
  countryName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: font.sizes.md,
    fontWeight: '500',
  },
  countryDial: {
    color: colors.textSecondary,
    fontSize: font.sizes.sm,
    marginRight: 4,
  },
  closeBtn: {
    marginTop: spacing.md,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontSize: font.sizes.lg,
    fontWeight: '600',
  },
});
