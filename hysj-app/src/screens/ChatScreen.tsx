import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Message } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { getInitials, getAvatarColor, getSession } from '../services/auth';
import { startHub, sendMessage, decryptReceived, decodeLegacyBlob, loadRatchetState, acknowledgeDelivery, extractX3DHHandshake } from '../services/chatHub';
import { getMessages, appendMessage, upsertConversation, markRead } from '../services/localStore';
import { registerWipeListener, onWipeExecuted } from '../services/wipeService';
import { replenishPreKeysIfNeeded } from '../services/keyManager';
import { establishOutgoingSession, establishIncomingSession } from '../services/sessionManager';
import { getUserStatus } from '../services/api';
import type { RatchetState } from '../crypto';

type Props = {
  navigation: StackNavigationProp<RootStackParamList, 'Chat'>;
  route: RouteProp<RootStackParamList, 'Chat'>;
};

export default function ChatScreen({ navigation, route }: Props) {
  const { conversation } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText]         = useState('');
  const [sending, setSending]   = useState(false);
  const [hubError, setHubError] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [peerOnline, setPeerOnline] = useState<boolean | null>(null);
  const [peerLastSeen, setPeerLastSeen] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const myUserIdRef = useRef('');
  const myUsernameRef = useRef('');
  const ratchetRef = useRef<RatchetState | null>(null);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  const formatLastSeen = (iso: string): string => {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Active just now';
    if (diffMin < 60) return `Active ${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `Active ${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `Active ${diffDays}d ago`;
  };

  const getStatusText = (): string => {
    if (hubError) return 'Offline mode';
    if (peerOnline === true) return 'Online';
    if (peerLastSeen) return formatLastSeen(peerLastSeen);
    return 'End-to-end encrypted';
  };

  const getStatusColor = (): string => {
    if (peerOnline === true) return colors.online;
    if (hubError) return colors.danger;
    return colors.textSecondary;
  };

  const reload = async () => {
    const msgs = await getMessages(conversation.id);
    setMessages([...msgs]);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getSession();
      if (!s) return;
      myUserIdRef.current   = s.userId;
      myUsernameRef.current = s.username;

      // Load or establish ratchet session for this conversation
      ratchetRef.current = await loadRatchetState(conversation.id);
      if (!ratchetRef.current && conversation.peerDeviceId) {
        try {
          ratchetRef.current = await establishOutgoingSession(
            conversation.id,
            conversation.peerDeviceId,
          );
        } catch {
          // X3DH failed (peer offline, no pre-keys, etc.) — will retry on send
        }
      }
      if (mounted) setSessionReady(true);

      await reload();
      await markRead(conversation.id);

      // Fetch peer online status
      getUserStatus(conversation.peerUserId)
        .then(res => {
          if (!mounted) return;
          setPeerOnline(res.data.isOnline);
          setPeerLastSeen(res.data.lastSeenAt);
        })
        .catch(() => {});

      // Replenish pre-keys if running low
      replenishPreKeysIfNeeded(s.deviceId).catch(() => {});

      try {
        const hub = await startHub();

        // Register wipe listener
        registerWipeListener();
        const unsubWipe = onWipeExecuted((cmd) => {
          if (cmd.type === 'All' || cmd.type === 'Device' ||
              (cmd.type === 'Conversation' && cmd.conversationId === conversation.id)) {
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        });

        hub.on('ReceiveMessage', async (messageId: string, blob: string) => {
          if (!mounted) return;

          // Acknowledge delivery so server deletes from Redis
          acknowledgeDelivery(messageId, s.deviceId).catch(() => {});

          // If no ratchet exists, check for X3DH handshake data (Bob/responder side)
          if (!ratchetRef.current) {
            const handshake = extractX3DHHandshake(blob);
            if (handshake) {
              try {
                ratchetRef.current = await establishIncomingSession(conversation.id, handshake);
              } catch {
                // X3DH responder failed — fall through to legacy decode
              }
            }
          }

          // Try ratchet decryption first, fall back to legacy
          let decoded: { senderUserId: string; senderUsername: string; text: string } | null = null;

          if (ratchetRef.current) {
            decoded = await decryptReceived(blob, conversation.id, ratchetRef.current);
          }
          if (!decoded) {
            decoded = decodeLegacyBlob(blob);
          }

          if (!decoded || decoded.senderUserId !== conversation.peerUserId) return;

          const msg: Message = {
            id: messageId,
            conversationId: conversation.id,
            content: decoded.text,
            isOutgoing: false,
            senderAlias: decoded.senderUsername,
            sentAt: new Date().toISOString(),
          };
          await appendMessage(conversation.id, msg);
          await upsertConversation({
            ...conversation,
            lastMessagePreview: decoded.text,
            lastMessageAt: msg.sentAt,
            unreadCount: 0,
          });
          if (mounted) {
            setMessages(prev => [...prev, msg]);
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
          }
        });
      } catch {
        if (mounted) setHubError(true);
      }
    })();

    return () => { mounted = false; };
  }, []);

  const send = async () => {
    if (!text.trim() || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    const msg: Message = {
      id: Date.now().toString(),
      conversationId: conversation.id,
      content,
      isOutgoing: true,
      sentAt: new Date().toISOString(),
      deliveryStatus: 'sent',
    };

    setMessages(prev => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    let failed = false;
    try {
      // Establish session on-demand if not yet ready
      if (!ratchetRef.current && conversation.peerDeviceId) {
        ratchetRef.current = await establishOutgoingSession(
          conversation.id,
          conversation.peerDeviceId,
        );
      }
      if (ratchetRef.current) {
        await sendMessage(
          conversation.peerDeviceId,
          myUserIdRef.current,
          myUsernameRef.current,
          content,
          conversation.id,
          ratchetRef.current,
        );
      } else {
        failed = true;
      }
    } catch {
      failed = true;
    }

    if (failed) {
      msg.sendFailed = true;
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, sendFailed: true } : m));
    }

    await appendMessage(conversation.id, msg);
    await upsertConversation({
      ...conversation,
      lastMessagePreview: content,
      lastMessageAt: msg.sentAt,
    });
    setSending(false);
  };

  const retry = async (failedMsg: Message) => {
    // Clear failed status optimistically
    setMessages(prev => prev.map(m => m.id === failedMsg.id ? { ...m, sendFailed: false } : m));
    try {
      if (!ratchetRef.current && conversation.peerDeviceId) {
        ratchetRef.current = await establishOutgoingSession(
          conversation.id,
          conversation.peerDeviceId,
        );
      }
      if (ratchetRef.current) {
        await sendMessage(
          conversation.peerDeviceId,
          myUserIdRef.current,
          myUsernameRef.current,
          failedMsg.content,
          conversation.id,
          ratchetRef.current,
        );
      } else {
        throw new Error('No session');
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === failedMsg.id ? { ...m, sendFailed: true } : m));
    }
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View>
      {item.isOutgoing ? (
        <View style={styles.rowOut}>
          <View style={[styles.bubbleOut, item.sendFailed && styles.bubbleOutFailed]}>
            <Text style={styles.bubbleOutText}>{item.content}</Text>
          </View>
          {item.sendFailed ? (
            <View style={styles.failedRow}>
              <Text style={styles.failedText}>Failed to send</Text>
              <TouchableOpacity onPress={() => retry(item)}>
                <Text style={styles.retryBtn}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.timeStatusRow}>
              <Text style={styles.timeOut}>{formatTime(item.sentAt)}</Text>
              {item.deliveryStatus === 'read' ? (
                <Ionicons name="checkmark-done" size={14} color="#3B82F6" />
              ) : item.deliveryStatus === 'delivered' ? (
                <Ionicons name="checkmark-done" size={14} color={colors.textMuted} />
              ) : (
                <Ionicons name="checkmark" size={14} color={colors.textMuted} />
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.rowIn}>
          <View style={[styles.inAvatar, { backgroundColor: getAvatarColor(conversation.peerUsername) }]}>
            <Text style={styles.inAvatarText}>{getInitials(conversation.peerUsername)}</Text>
          </View>
          <View style={styles.inBubbleWrap}>
            <View style={styles.bubbleIn}>
              <Text style={styles.bubbleInText}>{item.content}</Text>
            </View>
            <Text style={styles.timeIn}>{formatTime(item.sentAt)}</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerAvatarWrap}>
            <View style={[styles.headerAvatar, { backgroundColor: getAvatarColor(conversation.peerUsername) }]}>
              <Text style={styles.headerAvatarText}>{getInitials(conversation.peerUsername)}</Text>
            </View>
            {peerOnline && <View style={styles.headerOnlineDot} />}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{conversation.peerUsername}</Text>
            <Text style={[styles.headerStatus, { color: getStatusColor() }]}>
              {getStatusText()}
            </Text>
          </View>
          <TouchableOpacity style={styles.headerMenuBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          ListHeaderComponent={
            sessionReady && ratchetRef.current ? (
              <View style={styles.sessionBanner}>
                <Text style={styles.sessionBannerText}>Secure session established</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatCircle}>
                <Ionicons name="lock-closed" size={28} color={colors.shield} />
              </View>
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatHint}>
                {sessionReady && ratchetRef.current
                  ? 'Quantum-resistant encryption active'
                  : 'Establishing secure session...'}
              </Text>
            </View>
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              returnKeyType="send"
              onSubmitEditing={send}
              multiline
            />
          </View>
          <TouchableOpacity
            style={[styles.sendBtn, text.trim() ? styles.sendBtnActive : null]}
            onPress={send}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Ionicons name="send" size={20} color={colors.white} />}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 12, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: colors.white, fontSize: 15, fontWeight: font.weights.bold },
  headerOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.online,
    borderWidth: 2, borderColor: colors.bgSurface,
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: font.sizes.md, fontWeight: font.weights.bold,
    color: colors.textPrimary,
  },
  headerStatus: { fontSize: 12, marginTop: 1 },
  headerMenuBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  // Message list
  listContent: { paddingVertical: 12, paddingHorizontal: 14, flexGrow: 1 },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.bgSurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyChatText: {
    fontSize: font.sizes.md, fontWeight: font.weights.semibold,
    color: colors.textPrimary,
  },
  emptyChatHint: { fontSize: font.sizes.sm, color: colors.textSecondary, marginTop: 4 },

  // Outgoing bubble — purple, right-aligned
  rowOut: { alignItems: 'flex-end', marginVertical: 4 },
  bubbleOut: {
    backgroundColor: colors.bubbleOut,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    maxWidth: '78%',
  },
  bubbleOutText: { color: colors.bubbleOutText, fontSize: 15, lineHeight: 21 },
  timeStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginRight: 6 },
  timeOut: { color: colors.textMuted, fontSize: 10 },

  // Incoming bubble — dark card, left-aligned with avatar
  rowIn: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 4 },
  inAvatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  inAvatarText: { color: colors.white, fontSize: 12, fontWeight: font.weights.bold },
  inBubbleWrap: { maxWidth: '78%' },
  bubbleIn: {
    backgroundColor: colors.bubbleIn,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderBottomLeftRadius: 6, borderBottomRightRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  bubbleInText: { color: colors.bubbleInText, fontSize: 15, lineHeight: 21 },
  timeIn: { color: colors.textMuted, fontSize: 10, marginTop: 4, marginLeft: 6 },

  // Session banner
  sessionBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: 12,
  },
  sessionBannerText: {
    fontSize: font.sizes.xs, color: colors.shield,
    fontWeight: font.weights.medium,
  },

  // Failed message
  bubbleOutFailed: {
    backgroundColor: colors.danger,
    opacity: 0.8,
  },
  failedRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginTop: 4, marginRight: 6,
  },
  failedText: {
    fontSize: 10, color: colors.danger,
  },
  retryBtn: {
    fontSize: 10, color: colors.purpleLight,
    fontWeight: font.weights.bold,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 12, paddingVertical: 10,
    paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: colors.bgInput,
    borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 18, paddingVertical: 10, minHeight: 48,
    justifyContent: 'center',
  },
  input: { color: colors.textPrimary, fontSize: 15, maxHeight: 100 },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: colors.purple,
  },
});
