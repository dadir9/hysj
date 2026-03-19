import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Animated,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Message } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { getInitials, getAvatarColor, getSession } from '../services/auth';
import { startHub, getHub, sendMessage, decryptReceived, loadRatchetState, acknowledgeDelivery, extractX3DHHandshake } from '../services/chatHub';
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
  const [peerTyping, setPeerTyping] = useState(false);
  const listRef = useRef<FlatList>(null);
  const myUserIdRef = useRef('');
  const myUsernameRef = useRef('');
  const ratchetRef = useRef<RatchetState | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

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

  // Typing dot animation
  useEffect(() => {
    if (!peerTyping) return;
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); dot1.setValue(0); dot2.setValue(0); dot3.setValue(0); };
  }, [peerTyping]);

  const handleTextChange = useCallback((value: string) => {
    setText(value);
    const now = Date.now();
    if (now - lastTypingSentRef.current < 3000) return;
    lastTypingSentRef.current = now;
    const hub = getHub();
    if (hub) {
      hub.invoke('SendTypingIndicator', conversation.peerDeviceId, true).catch(() => {});
    }
  }, [conversation.peerDeviceId]);

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

        hub.on('MessageDelivered', (messageId: string) => {
          if (!mounted) return;
          setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, deliveryStatus: 'delivered' as const } : m
          ));
        });

        hub.on('MessageRead', (messageId: string) => {
          if (!mounted) return;
          setMessages(prev => prev.map(m =>
            m.id === messageId ? { ...m, deliveryStatus: 'read' as const } : m
          ));
        });

        hub.on('UserTyping', (userId: string, isTyping: boolean) => {
          if (!mounted || userId !== conversation.peerUserId) return;
          setPeerTyping(isTyping);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          if (isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              if (mounted) setPeerTyping(false);
            }, 3000);
          }
        });

        hub.on('ReceiveMessage', async (msg: { messageId: string; encryptedBlob: string }) => {
          if (!mounted) return;
          const { messageId, encryptedBlob: blob } = msg;

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

          // Decrypt with ratchet — no fallback to unencrypted
          let decoded: { senderUserId: string; senderUsername: string; text: string } | null = null;

          if (ratchetRef.current) {
            decoded = await decryptReceived(blob, conversation.id, ratchetRef.current);
          }
          if (!decoded) {
            throw new Error('Ratchet decryption failed: no valid ratchet state or decryption error');
          }

          if (!decoded || decoded.senderUserId !== conversation.peerUserId) return;

          const incoming: Message = {
            id: messageId,
            conversationId: conversation.id,
            content: decoded.text,
            isOutgoing: false,
            senderAlias: decoded.senderUsername,
            sentAt: new Date().toISOString(),
          };
          await appendMessage(conversation.id, incoming);
          await upsertConversation({
            ...conversation,
            lastMessagePreview: decoded.text,
            lastMessageAt: incoming.sentAt,
            unreadCount: 0,
          });
          if (mounted) {
            setMessages(prev => [...prev, incoming]);
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

  const formatDateSeparator = (iso: string): string => {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((today.getTime() - msgDay.getTime()) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const shouldShowDateSeparator = (index: number): boolean => {
    if (index === 0) return true;
    const curr = new Date(messages[index].sentAt);
    const prev = new Date(messages[index - 1].sentAt);
    return curr.toDateString() !== prev.toDateString();
  };

  // Group consecutive messages and show time between groups
  const shouldShowTime = (index: number): boolean => {
    if (index === messages.length - 1) return true;
    const curr = messages[index];
    const next = messages[index + 1];
    if (curr.isOutgoing !== next.isOutgoing) return true;
    const diffMs = new Date(next.sentAt).getTime() - new Date(curr.sentAt).getTime();
    return diffMs > 120000; // 2 min gap
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => (
    <View>
      {shouldShowDateSeparator(index) && (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <Text style={styles.dateText}>{formatDateSeparator(item.sentAt)}</Text>
          <View style={styles.dateLine} />
        </View>
      )}
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
          ) : shouldShowTime(index) ? (
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
          ) : null}
        </View>
      ) : (
        <View style={styles.rowIn}>
          <View style={styles.inAvatar}>
            <Text style={styles.inAvatarText}>{getInitials(conversation.peerUsername)}</Text>
          </View>
          <View style={styles.inBubbleWrap}>
            <View style={styles.bubbleIn}>
              <Text style={styles.bubbleInText}>{item.content}</Text>
            </View>
            {shouldShowTime(index) && (
              <Text style={styles.timeIn}>{formatTime(item.sentAt)}</Text>
            )}
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
          <TouchableOpacity style={styles.headerActionBtn}>
            <Ionicons name="call" size={18} color={colors.white} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerMenuBtn}>
            <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <View style={{ flex: 1 }}>
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

          {/* Floating action button */}
          <TouchableOpacity style={styles.fab}>
            <Ionicons name="add" size={24} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Typing indicator */}
        {peerTyping && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>{conversation.peerUsername} is typing</Text>
            <View style={styles.typingDots}>
              <Animated.View style={[styles.typingDot, { opacity: dot1 }]} />
              <Animated.View style={[styles.typingDot, { opacity: dot2 }]} />
              <Animated.View style={[styles.typingDot, { opacity: dot3 }]} />
            </View>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Write"
              placeholderTextColor={colors.white}
              value={text}
              onChangeText={handleTextChange}
              returnKeyType="send"
              onSubmitEditing={send}
              multiline
            />
          </View>
          <TouchableOpacity
            style={styles.sendBtn}
            onPress={send}
            disabled={sending}
          >
            {sending
              ? <ActivityIndicator color={colors.white} size="small" />
              : <Ionicons name="send" size={18} color={colors.white} />}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#292F3F' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#292F3F',
    paddingHorizontal: 12, paddingVertical: 12,
    gap: 10,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarWrap: { position: 'relative' },
  headerAvatar: {
    width: 44, height: 44, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: colors.white, fontSize: 15, fontWeight: font.weights.bold },
  headerOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#00AC83',
    borderWidth: 2, borderColor: '#292F3F',
  },
  headerInfo: { flex: 1 },
  headerName: {
    fontSize: 15, fontWeight: font.weights.bold,
    color: '#FFFFFF',
  },
  headerStatus: { fontSize: 12, marginTop: 1 },
  headerActionBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#00AC83',
    alignItems: 'center', justifyContent: 'center',
  },
  headerMenuBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#373E4E',
    alignItems: 'center', justifyContent: 'center',
  },

  // Message list
  listContent: { paddingVertical: 12, paddingHorizontal: 16, flexGrow: 1 },

  // Date separator
  dateSeparator: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: 16, paddingHorizontal: 8,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dateText: {
    color: colors.textMuted, fontSize: 11,
    marginHorizontal: 12, fontWeight: font.weights.medium,
  },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#373E4E',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyChatText: {
    fontSize: 14, fontWeight: font.weights.semibold,
    color: '#FFFFFF',
  },
  emptyChatHint: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },

  // Outgoing bubble — dark, right-aligned
  rowOut: { alignItems: 'flex-end', marginVertical: 3 },
  bubbleOut: {
    backgroundColor: '#272A35',
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    maxWidth: '75%',
  },
  bubbleOutText: { color: '#FFFFFF', fontSize: 13, fontWeight: font.weights.light, lineHeight: 19 },
  bubbleOutFailed: {
    backgroundColor: colors.danger,
    opacity: 0.8,
  },
  timeStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginRight: 4 },
  timeOut: { color: '#FFFFFF', fontSize: 12, fontWeight: font.weights.regular },

  // Incoming bubble — with small avatar, left-aligned
  rowIn: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 3, gap: 8 },
  inAvatar: {
    width: 24, height: 24, borderRadius: 30,
    backgroundColor: '#373E4E',
    alignItems: 'center', justifyContent: 'center',
  },
  inAvatarText: { color: '#FFFFFF', fontSize: 9, fontWeight: font.weights.bold },
  inBubbleWrap: { maxWidth: '70%' },
  bubbleIn: {
    backgroundColor: '#373E4E',
    borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  bubbleInText: { color: '#FFFFFF', fontSize: 13, fontWeight: font.weights.light, lineHeight: 19 },
  timeIn: { color: '#FFFFFF', fontSize: 12, fontWeight: font.weights.regular, marginTop: 4, marginLeft: 4 },

  // Floating action button
  fab: {
    position: 'absolute', bottom: 16, right: 16,
    width: 45, height: 45, borderRadius: 22,
    backgroundColor: '#000000',
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4,
  },

  // Session banner
  sessionBanner: {
    alignSelf: 'center',
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: radius.pill,
    paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: 12,
  },
  sessionBannerText: {
    fontSize: font.sizes.xs, color: colors.shield,
    fontWeight: font.weights.medium,
  },

  // Failed message
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

  // Typing indicator
  typingRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 6,
    gap: 6,
  },
  typingText: { color: colors.textMuted, fontSize: 12 },
  typingDots: { flexDirection: 'row', gap: 3 },
  typingDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: colors.textMuted,
  },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#292F3F',
    paddingHorizontal: 14, paddingVertical: 10,
    paddingBottom: 28,
    gap: 10,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 10,
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
  },
  input: { color: '#FFFFFF', fontSize: 14, maxHeight: 40 },
  sendBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#00AC83',
    alignItems: 'center', justifyContent: 'center',
  },
});
