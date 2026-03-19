import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Modal,
  TextInput, Pressable, Image, Animated as RNAnimated, Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Conversation } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { getSession, getInitials, getAvatarColor, clearSession } from '../services/auth';
import { getConversations, upsertConversation, deleteConversation } from '../services/localStore';
import { startHub, stopHub, decryptReceived, loadRatchetState, acknowledgeDelivery, registerGroupMessageListener, onGroupMessage, registerDeliveryStatusListeners } from '../services/chatHub';
import { registerWipeListener, onWipeExecuted } from '../services/wipeService';
import { getUserStatusBatch } from '../services/api';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'ConversationList'> };

export default function ConversationListScreen({ navigation }: Props) {
  const [username, setUsername]           = useState('');
  const [userId, setUserId]               = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [menuOpen, setMenuOpen]           = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');

  const reload = async () => {
    const convs = await getConversations();
    setConversations([...convs]);
    refreshOnlineStatus(convs);
  };

  const refreshOnlineStatus = async (convs: Conversation[]) => {
    if (convs.length === 0) return;
    try {
      const userIds = [...new Set(convs.map(c => c.peerUserId))];
      const res = await getUserStatusBatch(userIds);
      const statusMap = new Map(res.data.map(s => [s.userId, s]));
      setConversations(prev =>
        prev.map(c => {
          const s = statusMap.get(c.peerUserId);
          return s ? { ...c, isOnline: s.isOnline, lastSeenAt: s.lastSeenAt ?? undefined } : c;
        }),
      );
    } catch {
      // Batch failed — leave status as-is
    }
  };

  useFocusEffect(useCallback(() => { reload(); }, []));

  useEffect(() => {
    let mounted = true;
    const cleanups: (() => void)[] = [];

    (async () => {
      const s = await getSession();
      if (!s) { navigation.replace('Login'); return; }
      setUsername(s.username);
      setUserId(s.userId);

      try {
        const hub = await startHub();

        hub.on('ReceiveMessage', async (msg: { messageId: string; encryptedBlob: string }) => {
          if (!mounted) return;

          acknowledgeDelivery(msg.messageId, s.deviceId).catch(() => {});

          const convs = await getConversations();

          // Sender identity is ONLY available inside the encrypted payload (Sealed Sender).
          // Try ratchet decryption against all known conversations to identify the sender.
          let decoded: { senderUserId: string; senderUsername: string; text: string } | null = null;
          let matchedConvId: string | null = null;

          for (const conv of convs) {
            const ratchet = await loadRatchetState(conv.id);
            if (!ratchet) continue;
            const result = await decryptReceived(msg.encryptedBlob, conv.id, ratchet);
            if (result) {
              decoded = result;
              matchedConvId = conv.id;
              break;
            }
          }

          if (!decoded) {
            throw new Error('Ratchet decryption failed: no valid ratchet state or decryption error');
          }

          const existing = convs.find(c => c.peerUserId === decoded!.senderUserId);
          const convId = matchedConvId ?? existing?.id ?? decoded.senderUserId;
          const peerDeviceId = existing?.peerDeviceId ?? '';

          await upsertConversation({
            id: convId,
            peerUserId: decoded.senderUserId,
            peerUsername: decoded.senderUsername,
            peerDeviceId,
            lastMessagePreview: decoded.text,
            lastMessageAt: new Date().toISOString(),
            unreadCount: (existing?.unreadCount ?? 0) + 1,
          });
          if (mounted) reload();
        });

        // Register group message listener
        registerGroupMessageListener();
        const unsubGroup = onGroupMessage(async (msg) => {
          if (!mounted) return;

          acknowledgeDelivery(msg.messageId, s.deviceId).catch(() => {});

          const convs = await getConversations();
          const groupConv = convs.find(c => c.id === msg.groupId);

          const ratchet = groupConv ? await loadRatchetState(groupConv.id) : null;
          if (!ratchet) return;

          const decoded = await decryptReceived(msg.encryptedBlob, msg.groupId, ratchet);
          const displayName = msg.senderDisplay || decoded?.senderUsername || 'Unknown';
          const text = decoded?.text || '[encrypted]';

          await upsertConversation({
            id: msg.groupId,
            peerUserId: groupConv?.peerUserId ?? msg.groupId,
            peerUsername: groupConv?.peerUsername ?? 'Group',
            peerDeviceId: groupConv?.peerDeviceId ?? '',
            lastMessagePreview: `${displayName}: ${text}`,
            lastMessageAt: new Date().toISOString(),
            unreadCount: (groupConv?.unreadCount ?? 0) + 1,
          });
          if (mounted) reload();
        });
        cleanups.push(unsubGroup);

        // Register delivery status listeners
        registerDeliveryStatusListeners();

        // Register wipe listener and navigate to Login on wipe
        registerWipeListener();
        const unsubWipe = onWipeExecuted(() => {
          if (mounted) navigation.replace('Login');
        });
        cleanups.push(unsubWipe);
      } catch (e) {
        console.log('Hub connect failed (backend offline?):', e);
      }
    })();

    return () => {
      mounted = false;
      for (const cleanup of cleanups) {
        try { cleanup(); } catch { /* ignore */ }
      }
    };
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(c => c.peerUsername.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const openSwipeableRef = useRef<Swipeable | null>(null);

  const handleDelete = (conv: Conversation) => {
    Alert.alert(
      'Delete conversation',
      `Delete chat with ${conv.peerUsername}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            await deleteConversation(conv.id);
            reload();
          },
        },
      ],
    );
  };

  const handleArchive = (conv: Conversation) => {
    Alert.alert('Archived', `Chat with ${conv.peerUsername} archived.`);
    openSwipeableRef.current?.close();
  };

  const renderRightActions = (
    progress: RNAnimated.AnimatedInterpolation<number>,
    _dragX: RNAnimated.AnimatedInterpolation<number>,
    conv: Conversation,
  ) => {
    const translateMore = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [192, 0],
    });
    const translateArchive = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [128, 0],
    });
    const translateDelete = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [64, 0],
    });

    return (
      <View style={styles.swipeActionsRow}>
        <RNAnimated.View style={{ transform: [{ translateX: translateMore }] }}>
          <TouchableOpacity
            style={[styles.swipeAction, styles.swipeMore]}
            onPress={() => openSwipeableRef.current?.close()}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.white} />
            <Text style={styles.swipeActionText}>More</Text>
          </TouchableOpacity>
        </RNAnimated.View>
        <RNAnimated.View style={{ transform: [{ translateX: translateArchive }] }}>
          <TouchableOpacity
            style={[styles.swipeAction, styles.swipeArchive]}
            onPress={() => handleArchive(conv)}
          >
            <Ionicons name="archive" size={22} color={colors.white} />
            <Text style={styles.swipeActionText}>Archive</Text>
          </TouchableOpacity>
        </RNAnimated.View>
        <RNAnimated.View style={{ transform: [{ translateX: translateDelete }] }}>
          <TouchableOpacity
            style={[styles.swipeAction, styles.swipeDelete]}
            onPress={() => handleDelete(conv)}
          >
            <Ionicons name="trash" size={22} color={colors.white} />
            <Text style={styles.swipeActionText}>Delete</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </View>
    );
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Swipeable
      ref={(ref) => { if (ref) openSwipeableRef.current = ref; }}
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      onSwipeableWillOpen={() => {
        openSwipeableRef.current?.close();
      }}
    >
      <TouchableOpacity
        style={styles.convRow}
        onPress={() => navigation.navigate('Chat', { conversation: item })}
        activeOpacity={0.6}
      >
        <View style={styles.avatarWrap}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.peerUsername) }]}>
            <Text style={styles.avatarText}>{getInitials(item.peerUsername)}</Text>
          </View>
          {item.isOnline && <View style={styles.onlineDot}/>}
        </View>
        <View style={styles.convInfo}>
          <Text style={styles.convName} numberOfLines={1}>{item.peerUsername}</Text>
          <Text style={styles.convPreview} numberOfLines={1}>
            {item.lastMessagePreview || 'No messages yet'}
          </Text>
        </View>
        <View style={styles.convMeta}>
          <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  return (
    <SafeAreaView style={styles.root}>

      {/* Header — title only */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chatrooms</Text>
      </View>

      {/* Search bar + action buttons row */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.white} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor={colors.white}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('NewChat')}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Conversation list */}
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No conversations yet</Text>
          <Text style={styles.emptyHint}>Start a new chat to begin messaging</Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          renderItem={renderConversation}
        />
      )}

      {/* Floating action button — bottom right */}
      <TouchableOpacity style={styles.fab} onPress={() => setMenuOpen(true)}>
        <Ionicons name="ellipsis-horizontal" size={20} color={colors.white} />
      </TouchableOpacity>

      {/* Bottom sheet overlay — dark themed */}
      <Modal visible={menuOpen} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.sheet} onStartShouldSetResponder={() => true}>

            {/* Handle bar */}
            <View style={styles.sheetHandle} />

            {/* Search bar */}
            <View style={styles.sheetSearch}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.sheetInput}
                placeholder="Search chat, people and more..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Quick actions grid */}
            <View style={styles.sheetGrid}>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); navigation.navigate('CreateGroup'); }}>
                <View style={[styles.sheetGridIconCircle, { backgroundColor: 'rgba(124,58,237,0.15)' }]}>
                  <Ionicons name="people" size={22} color={colors.purple} />
                </View>
                <Text style={styles.sheetGridLabel}>Group</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); navigation.navigate('Security'); }}>
                <View style={[styles.sheetGridIconCircle, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                  <Ionicons name="time" size={22} color={colors.warning} />
                </View>
                <Text style={styles.sheetGridLabel}>History</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); }}>
                <View style={[styles.sheetGridIconCircle, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                  <Ionicons name="videocam" size={22} color={colors.online} />
                </View>
                <Text style={styles.sheetGridLabel}>Live</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); }}>
                <View style={[styles.sheetGridIconCircle, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
                  <Ionicons name="call" size={22} color="#3B82F6" />
                </View>
                <Text style={styles.sheetGridLabel}>Call</Text>
              </TouchableOpacity>
            </View>

            {/* Friends section */}
            {conversations.length > 0 && (
              <View style={styles.sheetFriends}>
                <Text style={styles.sheetFriendsTitle}>Friends</Text>
                <View style={styles.sheetFriendsRow}>
                  {conversations.slice(0, 4).map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={styles.sheetFriendItem}
                      onPress={() => {
                        setMenuOpen(false);
                        navigation.navigate('Chat', { conversation: c });
                      }}
                    >
                      <View style={[styles.sheetFriendAvatar, { backgroundColor: getAvatarColor(c.peerUsername) }]}>
                        <Text style={styles.sheetFriendInitials}>{getInitials(c.peerUsername)}</Text>
                      </View>
                      <Text style={styles.sheetFriendName} numberOfLines={1}>
                        {c.peerUsername.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Search results */}
            {searchQuery.trim() !== '' && (
              <View style={styles.sheetResults}>
                {filteredConversations.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.sheetResultItem}
                    onPress={() => {
                      setMenuOpen(false);
                      setSearchQuery('');
                      navigation.navigate('Chat', { conversation: c });
                    }}
                  >
                    <View style={[styles.sheetResultAvatar, { backgroundColor: getAvatarColor(c.peerUsername) }]}>
                      <Text style={styles.sheetResultInitials}>{getInitials(c.peerUsername)}</Text>
                    </View>
                    <Text style={styles.sheetResultName}>{c.peerUsername}</Text>
                  </TouchableOpacity>
                ))}
                {filteredConversations.length === 0 && (
                  <Text style={styles.sheetNoResult}>No results</Text>
                )}
              </View>
            )}

            {/* Close */}
            <TouchableOpacity style={styles.sheetClose} onPress={() => setMenuOpen(false)}>
              <Ionicons name="close" size={18} color={colors.textMuted} />
              <Text style={styles.sheetCloseText}>Close</Text>
            </TouchableOpacity>

          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#292F3F' },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: colors.white,
  },

  // Search row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.white,
    fontSize: 14,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#03A9F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: '300',
    marginTop: -2,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#565E70',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.bgSurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15, fontWeight: '400',
    color: colors.white, marginBottom: 6,
  },
  emptyHint: { fontSize: 13, color: colors.textSecondary },

  // Conversation list
  listContent: { paddingBottom: 100 },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#292F3F',
  },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  onlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.online,
    borderWidth: 2, borderColor: '#292F3F',
  },
  convInfo: { flex: 1, marginRight: 10 },
  convName: {
    fontSize: 15, fontWeight: '400',
    color: colors.white, marginBottom: 3,
  },
  convPreview: { fontSize: 13, fontWeight: '300', color: colors.white },
  convMeta: { alignItems: 'flex-end', gap: 6 },
  convTime: { fontSize: 15, fontWeight: '400', color: colors.white },
  badge: {
    backgroundColor: colors.purple, borderRadius: 11,
    minWidth: 22, height: 22,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: '700' },

  // Swipe actions
  swipeActionsRow: { flexDirection: 'row' },
  swipeAction: {
    width: 64, justifyContent: 'center', alignItems: 'center', gap: 4,
  },
  swipeMore: { backgroundColor: '#6B6B80' },
  swipeArchive: { backgroundColor: '#8E8E93' },
  swipeDelete: { backgroundColor: colors.danger },
  swipeActionText: { color: colors.white, fontSize: 10, fontWeight: '500' },

  // FAB — bottom right black circle
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },

  // Bottom sheet overlay — dark themed
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#292F3F',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 10, paddingBottom: 40, paddingHorizontal: 20,
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#565E70',
    alignSelf: 'center', marginBottom: 18,
  },
  sheetSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#000000', borderRadius: 10,
    height: 40, paddingHorizontal: 14, gap: 10,
    marginBottom: 20,
  },
  sheetInput: { flex: 1, color: colors.white, fontSize: 14 },
  sheetGrid: {
    flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24,
  },
  sheetGridItem: {
    alignItems: 'center', gap: 8, width: 70,
  },
  sheetGridIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetGridLabel: { color: colors.white, fontSize: 12, fontWeight: '500' },
  sheetFriends: { marginBottom: 20 },
  sheetFriendsTitle: {
    fontSize: 15, fontWeight: '400',
    color: colors.white, marginBottom: 14,
  },
  sheetFriendsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  sheetFriendItem: { alignItems: 'center', width: 64 },
  sheetFriendAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  sheetFriendInitials: { color: colors.white, fontSize: 16, fontWeight: '700' },
  sheetFriendName: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },
  sheetResults: { marginBottom: 16 },
  sheetResultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
  },
  sheetResultAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetResultInitials: { color: colors.white, fontSize: 14, fontWeight: '700' },
  sheetResultName: { color: colors.white, fontSize: 15 },
  sheetNoResult: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  sheetClose: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 10,
    backgroundColor: '#000000',
    height: 40,
  },
  sheetCloseText: { color: colors.textMuted, fontSize: 15, fontWeight: '500' },
});
