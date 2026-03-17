import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, SafeAreaView, Modal, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { wipeAll, wipeConversation, wipeDevice } from '../services/api';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Security'> };

type WipeAction = 'all' | 'conversation' | 'device' | null;

const WIPE_PREVIEW: Record<Exclude<WipeAction, null>, { items: string[]; warning: string }> = {
  all: {
    items: ['All messages on every device', 'All encryption keys & sessions', 'All local data & caches'],
    warning: 'This is irreversible. You will be signed out everywhere.',
  },
  conversation: {
    items: ['All messages in the conversation', 'Ratchet session with this contact', 'Local chat history on all devices'],
    warning: 'The other party will still have their own copy.',
  },
  device: {
    items: ['All messages on the device', 'All encryption keys on the device', 'All local data on the device'],
    warning: 'The device will be signed out and wiped.',
  },
};

const LAYERS = [
  { icon: '🔄', title: 'Double Ratchet',       sub: 'Forward secrecy per message',       color: '#10B981' },
  { icon: '⚛',  title: 'Post-Quantum Hybrid',  sub: 'ECC + Kyber lattice cryptography',  color: '#6366F1' },
  { icon: '🕵',  title: 'Sealed Sender',        sub: 'Server never knows who you are',    color: '#14B8A6' },
  { icon: '🧅',  title: 'Onion Routing',        sub: '3-hop layered encryption',          color: '#8B5CF6' },
];

export default function SecurityScreen({ navigation }: Props) {
  const [wipeAction, setWipeAction]   = useState<WipeAction>(null);
  const [totpCode, setTotpCode]       = useState('');
  const [targetId, setTargetId]       = useState('');
  const [busy, setBusy]               = useState(false);
  const [error, setError]             = useState('');
  const [countdown, setCountdown]     = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [wipeAction]);

  const openWipeDialog = (action: WipeAction) => {
    setWipeAction(action);
    setTotpCode('');
    setTargetId('');
    setError('');
    setConfirmText('');
    setCountdown(5);
  };

  const canConfirm = countdown === 0 && confirmText === 'WIPE' && !busy;

  const executeWipe = async () => {
    if (!totpCode.trim() || totpCode.length < 6) {
      setError('Enter your 6-digit 2FA code');
      return;
    }

    setBusy(true);
    setError('');
    try {
      switch (wipeAction) {
        case 'all':
          await wipeAll(totpCode);
          break;
        case 'conversation':
          if (!targetId.trim()) { setError('Enter conversation partner ID'); setBusy(false); return; }
          await wipeConversation(targetId, totpCode);
          break;
        case 'device':
          if (!targetId.trim()) { setError('Enter device ID'); setBusy(false); return; }
          await wipeDevice(targetId, totpCode);
          break;
      }
      setWipeAction(null);
      Alert.alert('Wipe sent', 'The wipe command has been sent to all target devices.');
    } catch (e: any) {
      if (e.response?.status === 401) {
        setError('Invalid 2FA code');
      } else {
        setError('Failed to send wipe command');
      }
    } finally {
      setBusy(false);
    }
  };

  const wipeTitle = wipeAction === 'all'
    ? 'Wipe All Devices'
    : wipeAction === 'conversation'
    ? 'Wipe Conversation'
    : 'Wipe Device';

  const wipeDescription = wipeAction === 'all'
    ? 'This will delete all messages, keys, and sessions on ALL your devices. This cannot be undone.'
    : wipeAction === 'conversation'
    ? 'This will delete a specific conversation on all your devices.'
    : 'This will delete all data on a specific device.';

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Security</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ENCRYPTION LAYERS</Text>
          <View style={styles.card}>
            {LAYERS.map((l, i) => (
              <View key={l.title}>
                <View style={styles.layerRow}>
                  <View style={[styles.layerIcon, { backgroundColor: l.color + '20' }]}>
                    <Text style={{ fontSize: 18 }}>{l.icon}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.layerTitle}>{l.title}</Text>
                    <Text style={styles.layerSub}>{l.sub}</Text>
                  </View>
                  <Text style={[styles.check, { color: l.color }]}>✓</Text>
                </View>
                {i < LAYERS.length - 1 && <View style={styles.layerDivider}/>}
              </View>
            ))}
          </View>
        </View>

        {/* Remote Wipe section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REMOTE WIPE</Text>

          {/* Wipe all */}
          <View style={[styles.card, styles.dangerCard, { marginBottom: 10 }]}>
            <View style={styles.wipeRow}>
              <View style={styles.wipeIconWrap}>
                <Text style={styles.wipeIcon}>💣</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.wipeTitle}>Wipe all devices</Text>
                <Text style={styles.wipeSub}>Delete everything on every device</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.wipeBtn} onPress={() => openWipeDialog('all')}>
              <Text style={styles.wipeBtnText}>Wipe Everything</Text>
            </TouchableOpacity>
          </View>

          {/* Wipe conversation */}
          <View style={[styles.card, { marginBottom: 10 }]}>
            <View style={styles.wipeRow}>
              <View style={[styles.wipeIconWrap, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <Text style={styles.wipeIcon}>💬</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.wipeTitle}>Wipe a conversation</Text>
                <Text style={styles.wipeSub}>Delete one chat on all devices</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.wipeBtn, styles.wipeBtnSecondary]}
              onPress={() => openWipeDialog('conversation')}
            >
              <Text style={[styles.wipeBtnText, { color: colors.warning }]}>Wipe Conversation</Text>
            </TouchableOpacity>
          </View>

          {/* Wipe device */}
          <View style={[styles.card, { marginBottom: 10 }]}>
            <View style={styles.wipeRow}>
              <View style={[styles.wipeIconWrap, { backgroundColor: 'rgba(124,58,237,0.15)' }]}>
                <Text style={styles.wipeIcon}>📱</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.wipeTitle}>Wipe a device</Text>
                <Text style={styles.wipeSub}>Delete all data on one device</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.wipeBtn, styles.wipeBtnSecondary]}
              onPress={() => openWipeDialog('device')}
            >
              <Text style={[styles.wipeBtnText, { color: colors.purpleLight }]}>Wipe Device</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 40 }}/>

      </ScrollView>

      {/* 2FA Confirmation Modal */}
      <Modal visible={wipeAction !== null} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setWipeAction(null)}>
          <View style={styles.dialog} onStartShouldSetResponder={() => true}>

            <Text style={styles.dialogTitle}>{wipeTitle}</Text>
            <Text style={styles.dialogDesc}>{wipeDescription}</Text>

            {/* Wipe preview */}
            {wipeAction && (
              <View style={styles.previewBox}>
                <Text style={styles.previewTitle}>WHAT WILL BE DELETED</Text>
                {WIPE_PREVIEW[wipeAction].items.map((item) => (
                  <View key={item} style={styles.previewRow}>
                    <Text style={styles.previewBullet}>-</Text>
                    <Text style={styles.previewItem}>{item}</Text>
                  </View>
                ))}
                <Text style={styles.previewWarning}>{WIPE_PREVIEW[wipeAction].warning}</Text>
              </View>
            )}

            {(wipeAction === 'conversation' || wipeAction === 'device') && (
              <>
                <Text style={styles.dialogLabel}>
                  {wipeAction === 'conversation' ? 'CONVERSATION PARTNER ID' : 'DEVICE ID'}
                </Text>
                <View style={styles.dialogInputWrap}>
                  <TextInput
                    style={styles.dialogInput}
                    placeholder={wipeAction === 'conversation' ? 'Enter partner user ID' : 'Enter device ID'}
                    placeholderTextColor={colors.textMuted}
                    value={targetId}
                    onChangeText={setTargetId}
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            <Text style={styles.dialogLabel}>2FA CODE</Text>
            <View style={styles.dialogInputWrap}>
              <TextInput
                style={styles.dialogInput}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={totpCode}
                onChangeText={setTotpCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            <Text style={styles.dialogLabel}>TYPE "WIPE" TO CONFIRM</Text>
            <View style={styles.dialogInputWrap}>
              <TextInput
                style={[styles.dialogInput, { letterSpacing: 2 }]}
                placeholder="WIPE"
                placeholderTextColor={colors.textMuted}
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {!!error && <Text style={styles.dialogError}>{error}</Text>}

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={styles.dialogCancel}
                onPress={() => setWipeAction(null)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogConfirm, !canConfirm && styles.dialogConfirmDisabled]}
                onPress={executeWipe}
                disabled={!canConfirm}
              >
                {busy
                  ? <ActivityIndicator color={colors.white} size="small"/>
                  : <Text style={styles.dialogConfirmText}>
                      {countdown > 0 ? `Wait (${countdown}s)` : 'Confirm Wipe'}
                    </Text>}
              </TouchableOpacity>
            </View>

          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSurface },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
    marginBottom: 4,
  },
  back: { fontSize: 24, color: colors.white },
  title: { fontSize: 22, fontWeight: font.weights.bold, color: colors.textPrimary },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: font.weights.bold,
    color: colors.textMuted, letterSpacing: 1.5, marginBottom: 10,
  },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 16,
  },
  layerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  layerIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  layerTitle: { fontSize: 14, fontWeight: font.weights.bold, color: colors.textPrimary },
  layerSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  check: { fontSize: 18, fontWeight: font.weights.bold },
  layerDivider: { height: 1, backgroundColor: colors.border, marginLeft: 48 },

  // Wipe cards
  dangerCard: { borderColor: 'rgba(255,59,48,0.4)', backgroundColor: 'rgba(255,59,48,0.06)' },
  wipeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  wipeIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(255,59,48,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  wipeIcon: { fontSize: 18 },
  wipeTitle: { fontSize: 14, fontWeight: font.weights.bold, color: colors.textPrimary },
  wipeSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  wipeBtn: {
    backgroundColor: colors.danger, borderRadius: radius.lg,
    height: 44, alignItems: 'center', justifyContent: 'center',
  },
  wipeBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.border,
  },
  wipeBtnText: { color: colors.white, fontSize: 14, fontWeight: font.weights.bold },

  // 2FA Dialog
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  dialog: {
    backgroundColor: colors.bgCard, borderRadius: 20,
    padding: 24, width: '100%', maxWidth: 380,
    borderWidth: 1, borderColor: colors.border,
  },
  dialogTitle: {
    fontSize: 20, fontWeight: font.weights.bold,
    color: colors.textPrimary, marginBottom: 8,
  },
  dialogDesc: {
    fontSize: 13, color: colors.textSecondary,
    lineHeight: 20, marginBottom: 20,
  },
  dialogLabel: {
    fontSize: 11, fontWeight: font.weights.bold,
    color: colors.textMuted, letterSpacing: 1.5,
    marginBottom: 8, marginLeft: 4,
  },
  dialogInputWrap: {
    backgroundColor: colors.bgInput, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    height: 48, justifyContent: 'center', paddingHorizontal: 16,
    marginBottom: 16,
  },
  dialogInput: { color: colors.textPrimary, fontSize: 16, letterSpacing: 4 },
  dialogError: {
    color: colors.danger, fontSize: 13, marginBottom: 12, marginLeft: 4,
  },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dialogCancel: {
    flex: 1, height: 48, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dialogCancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: font.weights.semibold },
  dialogConfirm: {
    flex: 1, height: 48, borderRadius: radius.lg,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },
  dialogConfirmDisabled: {
    backgroundColor: colors.bgElevated,
    opacity: 0.6,
  },
  dialogConfirmText: { color: colors.white, fontSize: 14, fontWeight: font.weights.bold },

  // Wipe preview
  previewBox: {
    backgroundColor: colors.dangerBg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewTitle: {
    fontSize: font.sizes.xs, fontWeight: font.weights.bold,
    color: colors.danger, letterSpacing: 1.5, marginBottom: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row', marginBottom: 4,
  },
  previewBullet: {
    color: colors.danger, fontSize: font.sizes.sm, marginRight: spacing.sm, lineHeight: 20,
  },
  previewItem: {
    color: colors.textSecondary, fontSize: font.sizes.sm, flex: 1, lineHeight: 20,
  },
  previewWarning: {
    color: colors.warning, fontSize: font.sizes.xs, marginTop: spacing.sm,
    fontWeight: font.weights.semibold,
  },
});
