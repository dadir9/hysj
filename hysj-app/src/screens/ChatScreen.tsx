import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
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
    if (diffMin < 1) return 'active just now';
    if (diffMin < 60) return `active ${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `active ${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `active ${diffDays}d ago`;
  };

  const getStatusText = (): string => {
    if (hubError) return 'offline mode';
    if (peerOnline === true) return 'online';
    if (peerLastSeen) return formatLastSeen(peerLastSeen);
    return 'end-to-end encrypted';
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
    };

    setMessages(prev => [...prev, msg]);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

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
      }
    } catch {
      // message queued or hub offline — still saved locally
    }

    await appendMessage(conversation.id, msg);
    await upsertConversation({
      ...conversation,
      lastMessagePreview: content,
      lastMessageAt: msg.sentAt,
    });
    setSending(false);
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View>
      {item.isOutgoing ? (
        <View style={styles.rowOut}>
          <View style={styles.bubbleOut}>
            <Text style={styles.bubbleOutText}>{item.content}</Text>
          </View>
          <Text style={styles.timeOut}>{formatTime(item.sentAt)}</Text>
        </View>
      ) : (
        <View style={styles.rowIn}>
          <View style={[styles.inAvatar, { backgroundColor: getAvatarColor(conversation.peerUsername) }]}>
            <Text style={styles.inAvatarText}>{getInitials(conversation.peerUsername)}</Text>
          </View>
          <View>
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <View style={[styles.headerAvatar, { backgroundColor: getAvatarColor(conversation.peerUsername) }]}>
            <Text style={styles.headerAvatarText}>{getInitials(conversation.peerUsername)}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{conversation.peerUsername}</Text>
            <Text style={[styles.headerStatus, peerOnline === true && styles.headerOnline]}>
              {getStatusText()}
            </Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatHint}>Say hello</Text>
            </View>
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              returnKeyType="send"
              onSubmitEditing={send}
              multiline
            />
          </View>
          <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={sending}>
            {sending
              ? <ActivityIndicator color={colors.black} size="small" />
              : <Text style={styles.sendIcon}>↑</Text>}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSurface },

  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: 10,
  },
  back: { fontSize: 24, color: colors.white, paddingRight: 4 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { color: colors.white, fontSize: 15, fontWeight: font.weights.bold },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: font.weights.bold, color: colors.textPrimary },
  headerStatus: { fontSize: 11, color: colors.shield },
  headerOnline: { color: colors.online },

  listContent: { paddingVertical: 10, paddingHorizontal: 12, flexGrow: 1 },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyChatText: { fontSize: 15, color: colors.textSecondary },
  emptyChatHint: { fontSize: 13, color: colors.textMuted, marginTop: 6 },

  // Outgoing — dark bubble, timestamps below
  rowOut: { alignItems: 'flex-end', marginVertical: 3 },
  bubbleOut: {
    backgroundColor: colors.bubbleOut,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 4,
    padding: 12, maxWidth: '75%',
  },
  bubbleOutText: { color: colors.bubbleOutText, fontSize: 14, lineHeight: 20 },
  timeOut: { color: colors.textMuted, fontSize: 10, marginTop: 4, marginRight: 4 },

  // Incoming — white bubble, timestamps below
  rowIn: { flexDirection: 'row', alignItems: 'flex-end', marginVertical: 3 },
  inAvatar: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  inAvatarText: { color: colors.white, fontSize: 11, fontWeight: font.weights.bold },
  bubbleIn: {
    backgroundColor: colors.bubbleIn,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    borderBottomLeftRadius: 4, borderBottomRightRadius: 20,
    padding: 12, maxWidth: 260,
  },
  bubbleInText: { color: colors.bubbleInText, fontSize: 14, lineHeight: 20 },
  timeIn: { color: colors.textMuted, fontSize: 10, marginTop: 4, marginLeft: 4 },

  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 14, paddingVertical: 10,
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
  input: { color: colors.textPrimary, fontSize: 14, maxHeight: 100 },
  sendBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: colors.black, fontSize: 22, fontWeight: font.weights.bold },
});
