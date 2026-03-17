import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Modal,
  TextInput, Animated, Pressable,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, Conversation } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { getSession, getInitials, getAvatarColor, clearSession } from '../services/auth';
import { getConversations, upsertConversation } from '../services/localStore';
import { startHub, stopHub, decryptReceived, decodeLegacyBlob, extractSender, loadRatchetState, acknowledgeDelivery } from '../services/chatHub';

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

          // Acknowledge delivery so server deletes from Redis
          acknowledgeDelivery(messageId, s.deviceId).catch(() => {});

          // Extract sender info from envelope (works for both ratchet and legacy)
          const sender = extractSender(blob);
          if (!sender) return;

          const convs = await getConversations();
          const existing = convs.find(c => c.peerUserId === sender.senderUserId);
          const convId = existing?.id ?? sender.senderUserId;
          const peerDeviceId = existing?.peerDeviceId ?? '';

          // Try ratchet decryption if we have state for this conversation
          let previewText = '';
          const ratchet = await loadRatchetState(convId);
          if (ratchet) {
            const decrypted = await decryptReceived(blob, convId, ratchet);
            if (decrypted) previewText = decrypted.text;
          }
          // Fall back to legacy decode
          if (!previewText) {
            const legacy = decodeLegacyBlob(blob);
            if (legacy) previewText = legacy.text;
          }
          // If both fail, show encrypted indicator
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
    return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
  };

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(c => c.peerUsername.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  return (
    <SafeAreaView style={styles.root}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>hysj</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Security')}>
            <Text style={styles.iconBtnText}>🔒</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.iconBtnText}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories strip */}
      {conversations.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
                    style={styles.storiesStrip} contentContainerStyle={styles.storiesContent}>
          {conversations.map(c => (
            <TouchableOpacity key={c.id} style={styles.storyItem}
                              onPress={() => navigation.navigate('Chat', { conversation: c })}>
              <View style={styles.storyRing}>
                <View style={[styles.storyAvatar, { backgroundColor: getAvatarColor(c.peerUsername) }]}>
                  <Text style={styles.storyInitials}>{getInitials(c.peerUsername)}</Text>
                </View>
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
        <Text style={styles.sectionCount}>{conversations.length}</Text>
      </View>

      {/* Conversation list */}
      {conversations.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptyHint}>Tap + to start a new chat</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.convCard}
              onPress={() => navigation.navigate('Chat', { conversation: item })}
              activeOpacity={0.7}
            >
              <View style={styles.avatarWrap}>
                <View style={[styles.avatar, { backgroundColor: getAvatarColor(item.peerUsername) }]}>
                  <Text style={styles.avatarText}>{getInitials(item.peerUsername)}</Text>
                </View>
                <View style={styles.onlineDot}/>
              </View>
              <View style={styles.convInfo}>
                <View style={styles.convRow}>
                  <Text style={styles.convName} numberOfLines={1}>{item.peerUsername}</Text>
                  <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
                </View>
                <View style={styles.convRow}>
                  <Text style={styles.convPreview} numberOfLines={1}>{item.lastMessagePreview || 'No messages yet'}</Text>
                  {item.unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          )}
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

            {/* Search bar */}
            <View style={styles.sheetSearch}>
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
                <Text style={styles.sheetGridIcon}>💬</Text>
                <Text style={styles.sheetGridLabel}>New Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); navigation.navigate('CreateGroup'); }}>
                <Text style={styles.sheetGridIcon}>👥</Text>
                <Text style={styles.sheetGridLabel}>New Group</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); navigation.navigate('Settings'); }}>
                <Text style={styles.sheetGridIcon}>⚙</Text>
                <Text style={styles.sheetGridLabel}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetGridItem}
                                onPress={() => { setMenuOpen(false); navigation.navigate('Security'); }}>
                <Text style={styles.sheetGridIcon}>🛡</Text>
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
  root: { flex: 1, backgroundColor: colors.bgSurface },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 22, paddingTop: 16, paddingBottom: 12,
  },
  logo: { fontSize: 38, fontWeight: font.weights.bold, color: colors.white, letterSpacing: -0.5 },
  headerRight: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 8 },
  iconBtnText: { fontSize: 19, color: colors.textSecondary },

  // Stories strip
  storiesStrip: { paddingLeft: 16, marginBottom: 4 },
  storiesContent: { paddingRight: 16, gap: 16, paddingBottom: 12 },
  storyItem: { alignItems: 'center', width: 68 },
  storyRing: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2, borderColor: colors.purple,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  storyAvatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  storyInitials: { color: colors.white, fontSize: 20, fontWeight: font.weights.bold },
  storyName: { color: colors.textSecondary, fontSize: 11, textAlign: 'center' },

  sectionRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 22, paddingVertical: 10,
  },
  sectionLabel: { fontSize: 16, fontWeight: font.weights.bold, color: colors.textPrimary, flex: 1 },
  sectionCount: { fontSize: 13, color: colors.textSecondary },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyText: { fontSize: 16, color: colors.textSecondary, fontWeight: font.weights.bold },
  emptyHint: { fontSize: 13, color: colors.textMuted, marginTop: 6 },

  listContent: { paddingBottom: 100 },
  convCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    marginHorizontal: 12, marginBottom: 6,
  },
  avatarWrap: { position: 'relative', marginRight: 12 },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 19, fontWeight: font.weights.bold },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.online,
    borderWidth: 2, borderColor: colors.bgCard,
  },
  convInfo: { flex: 1 },
  convRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convName: { fontSize: 15, fontWeight: font.weights.bold, color: colors.textPrimary, flex: 1 },
  convTime: { fontSize: 11, color: colors.textSecondary },
  convPreview: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  badge: {
    backgroundColor: colors.purple, borderRadius: 11,
    minWidth: 22, height: 22,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: font.weights.bold },

  // Floating menu pill
  menuPill: {
    position: 'absolute', bottom: 32, alignSelf: 'center',
    backgroundColor: colors.bgInput, borderRadius: 22,
    paddingHorizontal: 28, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
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
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingTop: 16, paddingBottom: 40, paddingHorizontal: 20,
    maxHeight: '70%',
  },
  sheetSearch: {
    backgroundColor: colors.bgInput, borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    height: 48, justifyContent: 'center', paddingHorizontal: 18,
    marginBottom: 20,
  },
  sheetInput: { color: colors.textPrimary, fontSize: 15 },
  sheetGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20,
  },
  sheetGridItem: {
    width: '47%', backgroundColor: colors.bgInput,
    borderRadius: radius.lg, padding: 16, alignItems: 'center', gap: 8,
  },
  sheetGridIcon: { fontSize: 24 },
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
