import React, { useState } from 'react';
import { View, Text, TextInput, Switch, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { createGroup } from '../services/api';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'CreateGroup'> };

export default function CreateGroupScreen({ navigation }: Props) {
  const [name, setName]               = useState('');
  const [isAnon, setIsAnon]           = useState(false);
  const [membersCanAdd, setMembersAdd] = useState(false);
  const [error, setError]             = useState('');
  const [busy, setBusy]               = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { setError('Group name is required'); return; }
    setBusy(true); setError('');
    try {
      await createGroup({ name, isAnonymous: isAnon, membersCanAdd });
      navigation.goBack();
    } catch {
      setError('Failed to create group');
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>New Group</Text>
        </View>

        <View style={styles.body}>

          <Text style={styles.label}>GROUP NAME</Text>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Enter group name"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          <Text style={styles.label}>GROUP TYPE</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity
              style={[styles.typeCard, !isAnon && styles.typeCardActive]}
              onPress={() => setIsAnon(false)}
            >
              <Text style={styles.typeEmoji}>👥</Text>
              <Text style={styles.typeTitle}>Normal</Text>
              <Text style={styles.typeSub}>Members see each other</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.typeCard, isAnon && styles.typeCardAnon]}
              onPress={() => setIsAnon(true)}
            >
              <Text style={styles.typeEmoji}>🎭</Text>
              <Text style={styles.typeTitle}>Anonymous</Text>
              <Text style={styles.typeSub}>Random alias per member</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Members can invite others</Text>
                <Text style={styles.rowSub}>Allow all members to add new people</Text>
              </View>
              <Switch
                value={membersCanAdd}
                onValueChange={setMembersAdd}
                trackColor={{ false: colors.border, true: colors.purple }}
                thumbColor={colors.white}
              />
            </View>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={[styles.createBtn, busy && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={busy}
          >
            <Text style={styles.createBtnText}>Create Group</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSurface },
  scroll: { flexGrow: 1 },
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
    color: colors.textMuted, letterSpacing: 1.5,
    marginBottom: 8, marginTop: 20, marginLeft: 4,
  },
  inputWrap: {
    backgroundColor: colors.bgInput, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    height: 52, justifyContent: 'center', paddingHorizontal: 16,
  },
  input: { color: colors.textPrimary, fontSize: 15 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  typeCard: {
    flex: 1, backgroundColor: colors.bgCard,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    padding: 16, alignItems: 'center', gap: 6,
  },
  typeCardActive: { borderColor: colors.purple, backgroundColor: 'rgba(124,58,237,0.08)' },
  typeCardAnon: { borderColor: colors.purple, backgroundColor: 'rgba(124,58,237,0.14)' },
  typeEmoji: { fontSize: 28 },
  typeTitle: { fontSize: 14, fontWeight: font.weights.bold, color: colors.textPrimary },
  typeSub: { fontSize: 11, color: colors.textSecondary, textAlign: 'center' },
  card: {
    backgroundColor: colors.bgCard, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 14, fontWeight: font.weights.bold, color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  error: { color: colors.danger, fontSize: 13, marginTop: 12, marginLeft: 4 },
  createBtn: {
    backgroundColor: colors.purple, borderRadius: radius.pill,
    height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 32,
  },
  createBtnText: { color: colors.white, fontSize: 16, fontWeight: font.weights.bold },
});
