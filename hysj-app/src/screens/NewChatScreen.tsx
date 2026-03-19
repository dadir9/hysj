import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
  StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { lookupUser } from '../services/api';
import { getInitials, getAvatarColor } from '../services/auth';
import { upsertConversation } from '../services/localStore';
import { establishOutgoingSession } from '../services/sessionManager';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'NewChat'> };

export default function NewChatScreen({ navigation }: Props) {
  const [query, setQuery]   = useState('');
  const [result, setResult] = useState<{ id: string; username: string; deviceIds: string[] } | null>(null);
  const [error, setError]   = useState('');
  const [busy, setBusy]     = useState(false);

  const validateUsername = (input: string): string | null => {
    const trimmed = input.trim();
    if (!trimmed) return 'Please enter a username';
    if (trimmed.length < 2) return 'Username must be at least 2 characters';
    if (trimmed.length > 50) return 'Username must be 50 characters or less';
    if (!/^[a-zA-Z0-9._-]+$/.test(trimmed))
      return 'Username can only contain letters, numbers, dots, hyphens, and underscores';
    return null;
  };

  const handleSearch = async () => {
    const validationError = validateUsername(query);
    if (validationError) { setError(validationError); return; }
    setBusy(true); setError(''); setResult(null);
    try {
      const res = await lookupUser(query.trim());
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.status === 404 ? 'User not found' : 'Connection error');
    } finally {
      setBusy(false);
    }
  };

  const openChat = async () => {
    if (!result || result.deviceIds.length === 0) {
      setError('User has no devices registered'); return;
    }
    setBusy(true);
    setError('');
    const conv = {
      id: result.id,
      peerUserId: result.id,
      peerUsername: result.username,
      peerDeviceId: result.deviceIds[0],
      lastMessagePreview: '',
      lastMessageAt: new Date().toISOString(),
      unreadCount: 0,
    };
    try {
      await establishOutgoingSession(conv.id, conv.peerDeviceId);
    } catch {
      // Session will be established on first send
    }
    await upsertConversation(conv);
    navigation.replace('Chat', { conversation: conv });
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={26} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Chat</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.body}>

          {/* ── Section label ── */}
          <Text style={styles.sectionLabel}>FIND USER</Text>

          {/* ── Search bar ── */}
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <Ionicons
                name="search"
                size={18}
                color={colors.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Enter username..."
                placeholderTextColor={colors.textMuted}
                value={query}
                onChangeText={(t) => { setQuery(t); if (error) setError(''); }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={50}
                returnKeyType="search"
                onSubmitEditing={handleSearch}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => { setQuery(''); setResult(null); setError(''); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.searchBtn, busy && styles.searchBtnDisabled]}
              onPress={handleSearch}
              disabled={busy}
              activeOpacity={0.8}
            >
              {busy
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Ionicons name="arrow-forward" size={20} color={colors.white} />}
            </TouchableOpacity>
          </View>

          {/* ── Error ── */}
          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* ── Result card ── */}
          {result && (
            <TouchableOpacity
              style={styles.resultCard}
              onPress={openChat}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: getAvatarColor(result.username) }]}>
                <Text style={styles.avatarInitials}>{getInitials(result.username)}</Text>
              </View>

              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{result.username}</Text>
                <Text style={styles.resultHint}>Tap to start conversation</Text>
              </View>

              <View style={styles.resultArrowWrap}>
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
              </View>
            </TouchableOpacity>
          )}

          {/* ── Empty state hint ── */}
          {!result && !error && !busy && (
            <View style={styles.hintWrap}>
              <Ionicons name="person-add-outline" size={48} color={colors.textDim} />
              <Text style={styles.hintText}>
                Search for a username to start a{'\n'}new encrypted conversation
              </Text>
            </View>
          )}

          {/* ── Loading overlay ── */}
          {busy && !result && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.purple} size="large" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMid,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },

  /* ── Body ── */
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  /* ── Section label ── */
  sectionLabel: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.bold,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },

  /* ── Search ── */
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgInput,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    height: 50,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: font.sizes.md,
    height: '100%',
  },
  searchBtn: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    backgroundColor: colors.purpleDark,
    opacity: 0.7,
  },

  /* ── Error ── */
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.md,
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: font.sizes.sm,
    fontWeight: font.weights.medium,
    flex: 1,
  },

  /* ── Result card ── */
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.white,
    fontSize: 20,
    fontWeight: font.weights.bold,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.semibold,
    color: colors.textPrimary,
  },
  resultHint: {
    fontSize: font.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  resultArrowWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Empty state ── */
  hintWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    gap: 16,
  },
  hintText: {
    fontSize: font.sizes.md,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  /* ── Loading ── */
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: font.sizes.sm,
    color: colors.textSecondary,
  },
});
