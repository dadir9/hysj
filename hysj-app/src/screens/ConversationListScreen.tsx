import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Modal,
  TextInput, Pressable, Image,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList, Conversation } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { getSession, getInitials, getAvatarColor, clearSession } from '../services/auth';
import { getConversations, upsertConversation } from '../services/localStore';
import { startHub, stopHub, decryptReceived, decodeLegacyBlob, extractSender, loadRatchetState, acknowledgeDelivery } from '../services/chatHub';
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
    (async () => {
      const s = await getSession();
      if (!s) { navigation.replace('Login'); return; }
      setUsername(s.username);
      setUserId(s.userId);

      try {
        const hub = await startHub();

        hub.on('ReceiveMessage', async (messageId: string, blob: string) => {
          if (!mounted) return;

          acknowledgeDelivery(messageId, s.deviceId).catch(() => {});

          const sender = extractSender(blob);
          if (!sender) return;

          const convs = await getConversations();
          const existing = convs.find(c => c.peerUserId === sender.senderUserId);
          const convId = existing?.id ?? sender.senderUserId;
          const peerDeviceId = existing?.peerDeviceId ?? '';

          let previewText = '';
          const ratchet = await loadRatchetState(convId);
          if (ratchet) {
            const decrypted = await decryptReceived(blob, convId, ratchet);
            if (decrypted) previewText = decrypted.text;
          }
          if (!previewText) {
            const legacy = decodeLegacyBlob(blob);
            if (legacy) previewText = legacy.text;
          }
          if (!previewText) previewText = '[encrypted message]';

          await upsertConversation({
            id: convId,
            peerUserId: sender.senderUserId,
            peerUsername: sender.senderUsername,
            peerDeviceId,
            lastMessagePreview: previewText,
            lastMessageAt: new Date().toISOString(),
            unreadCount: (existing?.unreadCount ?? 0) + 1,
          });
          if (mounted) reload();
        });
      } catch (e) {
        console.log('Hub connect failed (backend offline?):', e);
      }
    })();

    return () => {
      mounted = false;
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

  const renderConversation = ({ item }: { item: Conversation }) => (
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
  );

  return (
    <SafeAreaView style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>
              {conversations.length > 0
                ? `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}`
                : 'No conversations yet'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Security')}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories strip */}
      {conversations.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    style={styles.storiesStrip} contentContainerStyle={styles.storiesContent}>
          {/* Add new story / new chat */}
          <TouchableOpacity style={styles.storyItem} onPress={() => navigation.navigate('NewChat')}>
            <View style={styles.storyAddRing}>
              <Text style={styles.storyAddIcon}>+</Text>
            </View>
            <Text style={styles.storyName}>New</Text>
          </TouchableOpacity>
          {conversations.map(c => (
            <TouchableOpacity key={c.id} style={styles.storyItem}
                              onPress={() => navigation.navigate('Chat', { conversation: c })}>
              <View style={styles.storyRing}>
                <View style={[styles.storyAvatar, { backgroundColor: getAvatarColor(c.peerUsername) }]}>
                  <Text style={styles.storyInitials}>{getInitials(c.peerUsername)}</Text>
                </View>
                {c.isOnline && <View style={styles.storyOnlineDot}/>}
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {c.peerUsername.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Section label */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>All chats</Text>
        {conversations.length > 0 && (
          <View style={styles.sectionBadge}>
            <Text style={styles.sectionBadgeText}>{conversations.length}</Text>
          </View>
        )}
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
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* Floating Menu pill */}
      <TouchableOpacity style={styles.menuPill} onPress={() => setMenuOpen(true)}>
        <Text style={styles.menuPillText}>Menu</Text>
      </TouchableOpacity>

      {/* New chat FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('NewChat')}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Bottom sheet overlay */}
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
                placeholder="Search conversations..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Quick actions grid */}
            <View style={styles.sheetGrid}>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); navigation.navigate('NewChat'); }}>
                <View style={[styles.sheetGridIconCircle, { backgroundColor: 'rgba(124,58,237,0.15)' }]}>
                  <Ionicons name="chatbubble-outline" size={22} color={colors.purple} />
                </View>
                <Text style={styles.sheetGridLabel}>New Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); navigation.navigate('CreateGroup'); }}>
                <View style={[styles.sheetGridIconCircle, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                  <Ionicons name="people-outline" size={22} color={colors.shield} />
                </View>
                <Text style={styles.sheetGridLabel}>New Group</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); navigation.navigate('Settings'); }}>
                <View style={[styles.sheetGridIconCircle, { backgroundColor: 'rgba(139,143,163,0.15)' }]}>
                  <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
                </View>
                <Text style={styles.sheetGridLabel}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); navigation.navigate('Security'); }}>
                <View style={[styles.sheetGridIconCircle, { backgroundColor: 'rgba(52,199,89,0.15)' }]}>
                  <Text style={[styles.sheetGridIcon, { color: colors.online }]}>{'<shield>'}</Text>
                </View>
                <Text style={styles.sheetGridLabel}>Security</Text>
              </TouchableOpacity>
            </View>

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
              <Text style={styles.sheetCloseText}>Close</Text>
            </TouchableOpacity>

          </View>
        </Pressable>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 22, paddingTop: 18, paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLogo: { width: 38, height: 38 },
  headerTitle: {
    fontSize: font.sizes.xl, fontWeight: font.weights.bold,
    color: colors.textPrimary, letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: font.sizes.sm, color: colors.textSecondary, marginTop: 2,
  },
  headerRight: { flexDirection: 'row', gap: 6 },
  headerIconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.bgSurface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerIconText: { fontSize: 12, color: colors.textSecondary },

  // Stories strip
  storiesStrip: { paddingLeft: 18, marginBottom: 8 },
  storiesContent: { paddingRight: 18, gap: 14, paddingBottom: 14 },
  storyItem: { alignItems: 'center', width: 64 },
  storyAddRing: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: colors.textMuted, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  storyAddIcon: { fontSize: 24, color: colors.textMuted },
  storyRing: {
    width: 60, height: 60, borderRadius: 30,
    borderWidth: 2, borderColor: colors.purple,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
    position: 'relative',
  },
  storyAvatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  storyInitials: { color: colors.white, fontSize: 18, fontWeight: font.weights.bold },
  storyOnlineDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 2, borderColor: colors.bg,
  },
  storyName: { color: colors.textSecondary, fontSize: 11, textAlign: 'center' },

  // Section label
  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 22, paddingVertical: 10, gap: 8,
  },
  sectionLabel: {
    fontSize: font.sizes.lg, fontWeight: font.weights.bold,
    color: colors.textPrimary,
  },
  sectionBadge: {
    backgroundColor: colors.purple, borderRadius: 10,
    minWidth: 20, height: 20, paddingHorizontal: 6,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionBadgeText: {
    color: colors.white, fontSize: 11, fontWeight: font.weights.bold,
  },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 100 },
  emptyIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.bgSurface,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyIcon: { fontSize: 14, color: colors.textMuted },
  emptyTitle: {
    fontSize: font.sizes.lg, fontWeight: font.weights.bold,
    color: colors.textPrimary, marginBottom: 6,
  },
  emptyHint: { fontSize: font.sizes.sm, color: colors.textSecondary },

  // Conversation list
  listContent: { paddingBottom: 100, paddingHorizontal: 16 },
  separator: {
    height: 1, backgroundColor: colors.border,
    marginLeft: 76,
  },
  convRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 6,
  },
  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 19, fontWeight: font.weights.bold },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: colors.online,
    borderWidth: 2.5, borderColor: colors.bg,
  },
  convInfo: { flex: 1, marginRight: 10 },
  convName: {
    fontSize: font.sizes.md, fontWeight: font.weights.semibold,
    color: colors.textPrimary, marginBottom: 3,
  },
  convPreview: { fontSize: font.sizes.sm, color: colors.textSecondary },
  convMeta: { alignItems: 'flex-end', gap: 6 },
  convTime: { fontSize: 11, color: colors.textSecondary },
  badge: {
    backgroundColor: colors.purple, borderRadius: 11,
    minWidth: 22, height: 22,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: font.weights.bold },

  // Floating menu pill
  menuPill: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    backgroundColor: colors.bgElevated, borderRadius: 22,
    paddingHorizontal: 28, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 10,
  },
  menuPillText: { color: colors.white, fontSize: 15, fontWeight: font.weights.semibold },

  // FAB
  fab: {
    position: 'absolute', right: 24, bottom: 90,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.purple,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.purple, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 8,
  },
  fabText: { color: colors.white, fontSize: 28, lineHeight: 32 },

  // Bottom sheet overlay
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 10, paddingBottom: 40, paddingHorizontal: 20,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center', marginBottom: 18,
  },
  sheetSearch: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgInput, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    height: 48, paddingHorizontal: 16, gap: 10,
    marginBottom: 20,
  },
  sheetSearchIcon: { fontSize: 12, color: colors.textMuted },
  sheetInput: { flex: 1, color: colors.textPrimary, fontSize: 15 },
  sheetGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20,
  },
  sheetGridItem: {
    width: '47%', backgroundColor: colors.bgInput,
    borderRadius: radius.xl, padding: 16, alignItems: 'center', gap: 10,
  },
  sheetGridIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetGridIcon: { fontSize: 12 },
  sheetGridLabel: { color: colors.textPrimary, fontSize: 13, fontWeight: font.weights.semibold },
  sheetResults: { marginBottom: 16 },
  sheetResultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
  },
  sheetResultAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetResultInitials: { color: colors.white, fontSize: 14, fontWeight: font.weights.bold },
  sheetResultName: { color: colors.textPrimary, fontSize: 15 },
  sheetNoResult: { color: colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  sheetClose: {
    borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border,
    height: 48, alignItems: 'center', justifyContent: 'center',
  },
  sheetCloseText: { color: colors.textSecondary, fontSize: 15, fontWeight: font.weights.semibold },
});
