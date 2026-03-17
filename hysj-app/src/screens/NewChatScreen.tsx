import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
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
      // Establish X3DH session (hybrid ECC + ML-KEM-768)
      await establishOutgoingSession(conv.id, conv.peerDeviceId);
      await upsertConversation(conv);
      navigation.replace('Chat', { conversation: conv });
    } catch (e: any) {
      setError('Failed to establish secure session');
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>New Chat</Text>
      </View>

      <View style={styles.body}>
        <Text style={styles.label}>FIND USER</Text>
        <View style={styles.searchRow}>
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              maxLength={50}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={busy}>
            {busy
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Text style={styles.searchBtnText}>Search</Text>}
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        {result && (
          <TouchableOpacity style={styles.resultCard} onPress={openChat} activeOpacity={0.8}>
            <View style={[styles.resultAvatar, { backgroundColor: getAvatarColor(result.username) }]}>
              <Text style={styles.resultInitials}>{getInitials(result.username)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultName}>{result.username}</Text>
              <Text style={styles.resultSub}>Tap to open chat</Text>
            </View>
            <Text style={styles.resultArrow}>→</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSurface },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  back: { fontSize: 24, color: colors.white },
  title: { fontSize: 22, fontWeight: font.weights.bold, color: colors.textPrimary },
  body: { padding: 20 },
  label: {
    fontSize: 11, fontWeight: font.weights.bold,
    color: colors.textMuted, letterSpacing: 1.5, marginBottom: 8, marginLeft: 4,
  },
  searchRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  inputWrap: {
    backgroundColor: colors.bgInput, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    height: 52, justifyContent: 'center', paddingHorizontal: 16,
  },
  input: { color: colors.textPrimary, fontSize: 15 },
  searchBtn: {
    backgroundColor: colors.purple, borderRadius: radius.pill,
    height: 52, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center',
  },
  searchBtnText: { color: colors.white, fontSize: 14, fontWeight: font.weights.bold },
  error: { color: colors.danger, fontSize: 13, marginTop: 12, marginLeft: 4 },
  resultCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 16, marginTop: 20, gap: 14,
  },
  resultAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  resultInitials: { color: colors.white, fontSize: 20, fontWeight: font.weights.bold },
  resultName: { fontSize: 16, fontWeight: font.weights.bold, color: colors.textPrimary },
  resultSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  resultArrow: { fontSize: 20, color: colors.textSecondary },
});
