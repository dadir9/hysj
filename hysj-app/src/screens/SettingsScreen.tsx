import React, { useEffect, useState } from 'react';
import {
  View, Text, Switch, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types';
import { colors, font, spacing, radius } from '../constants/theme';
import { getSession, clearSession, getInitials, getAvatarColor } from '../services/auth';
import { getDevices, deleteDevice } from '../services/api';
import { registerForPushNotifications } from '../services/notifications';

type Props = { navigation: StackNavigationProp<RootStackParamList, 'Settings'> };

interface DeviceInfo {
  id: string;
  deviceName: string;
  isOnline: boolean;
  lastActiveAt: string;
}

export default function SettingsScreen({ navigation }: Props) {
  const [username, setUsername]       = useState('');
  const [currentDeviceId, setCurrentDeviceId] = useState('');
  const [is2FA, setIs2FA]             = useState(false);
  const [devices, setDevices]         = useState<DeviceInfo[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [pushToken, setPushToken]     = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const s = await getSession();
      if (s) {
        setUsername(s.username);
        setCurrentDeviceId(s.deviceId);
      }
      await loadDevices();
      const token = await registerForPushNotifications();
      setPushToken(token);
    })();
  }, []);

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const res = await getDevices();
      setDevices(res.data);
    } catch {
      // offline or error
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleDeleteDevice = (device: DeviceInfo) => {
    if (device.id === currentDeviceId) {
      Alert.alert('Cannot remove', 'You cannot remove the device you are currently using.');
      return;
    }
    Alert.alert(
      'Remove device',
      `Remove "${device.deviceName}" from your account? This device will no longer receive messages.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDevice(device.id);
              setDevices(prev => prev.filter(d => d.id !== device.id));
            } catch {
              Alert.alert('Error', 'Failed to remove device');
            }
          },
        },
      ],
    );
  };

  const formatLastActive = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const logout = async () => {
    await clearSession();
    navigation.replace('Login');
  };

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>

        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={[styles.profileAvatar, { backgroundColor: getAvatarColor(username) }]}>
            <Text style={styles.profileInitials}>{getInitials(username)}</Text>
          </View>
          <View>
            <Text style={styles.profileName}>{username}</Text>
            <Text style={styles.profileSub}>Hysj account</Text>
          </View>
        </View>

        <View style={styles.divider}/>

        {/* Devices section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DEVICES</Text>
          <View style={styles.card}>
            {loadingDevices ? (
              <ActivityIndicator color={colors.purple} style={{ paddingVertical: 16 }}/>
            ) : devices.length === 0 ? (
              <Text style={styles.deviceEmpty}>No devices found</Text>
            ) : (
              devices.map((device, i) => (
                <View key={device.id}>
                  <View style={styles.deviceRow}>
                    <View style={styles.deviceIconWrap}>
                      <Text style={styles.deviceIcon}>
                        {device.deviceName.toLowerCase().includes('mobile') ? '📱' : '💻'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.deviceNameRow}>
                        <Text style={styles.deviceName}>{device.deviceName}</Text>
                        {device.id === currentDeviceId && (
                          <View style={styles.currentBadge}>
                            <Text style={styles.currentBadgeText}>This device</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.deviceMeta}>
                        <View style={[
                          styles.statusDot,
                          { backgroundColor: device.isOnline ? colors.online : colors.textMuted },
                        ]}/>
                        <Text style={styles.deviceStatus}>
                          {device.isOnline ? 'Online' : formatLastActive(device.lastActiveAt)}
                        </Text>
                      </View>
                    </View>
                    {device.id !== currentDeviceId && (
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={() => handleDeleteDevice(device)}
                      >
                        <Text style={styles.removeBtnText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {i < devices.length - 1 && <View style={styles.deviceDivider}/>}
                </View>
              ))
            )}
          </View>
        </View>

        {/* Security section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SECURITY</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Two-factor authentication</Text>
                <Text style={styles.rowSub}>Extra layer of login protection</Text>
              </View>
              <Switch
                value={is2FA}
                onValueChange={setIs2FA}
                trackColor={{ false: colors.border, true: colors.purple }}
                thumbColor={colors.white}
              />
            </View>
          </View>
        </View>

        {/* Notifications section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Push notifications</Text>
                <Text style={styles.rowSub}>
                  {pushToken ? 'Enabled' : 'Not registered'}
                </Text>
              </View>
              <View style={[
                styles.notifBadge,
                { backgroundColor: pushToken ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.15)' },
              ]}>
                <Text style={[
                  styles.notifBadgeText,
                  { color: pushToken ? colors.online : colors.danger },
                ]}>
                  {pushToken ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>ABOUT</Text>
          <View style={styles.card}>
            <Text style={styles.aboutText}>
              Hysj uses Signal Protocol, post-quantum cryptography, sealed sender, and 3-hop onion routing.
            </Text>
            <View style={styles.badgeRow}>
              {['🔄 ratchet','⚛ quantum','🕵 sealed','🧅 onion'].map(b => (
                <View key={b} style={styles.badge}>
                  <Text style={styles.badgeText}>{b}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Sign out */}
        <View style={[styles.section, { marginBottom: 40 }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgSurface },
  header: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 20, paddingVertical: 16,
    gap: 14,
  },
  back: { fontSize: 24, color: colors.white },
  title: { fontSize: 22, fontWeight: font.weights.bold, color: colors.textPrimary },
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgCard,
    paddingHorizontal: 20, paddingBottom: 20, gap: 16,
  },
  profileAvatar: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  profileInitials: { color: colors.white, fontSize: 24, fontWeight: font.weights.bold },
  profileName: { fontSize: 18, fontWeight: font.weights.bold, color: colors.textPrimary },
  profileSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: {
    fontSize: 11, fontWeight: font.weights.bold,
    color: colors.textMuted, letterSpacing: 1.5, marginBottom: 10,
  },
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 16,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowTitle: { fontSize: 14, fontWeight: font.weights.bold, color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  // Devices
  deviceEmpty: { color: colors.textMuted, fontSize: 13, textAlign: 'center', paddingVertical: 8 },
  deviceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  deviceIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  deviceIcon: { fontSize: 18 },
  deviceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  deviceName: { fontSize: 14, fontWeight: font.weights.bold, color: colors.textPrimary },
  currentBadge: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  currentBadgeText: { fontSize: 10, color: colors.online, fontWeight: font.weights.semibold },
  deviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  deviceStatus: { fontSize: 12, color: colors.textSecondary },
  removeBtn: {
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  removeBtnText: { fontSize: 12, color: colors.danger, fontWeight: font.weights.semibold },
  deviceDivider: { height: 1, backgroundColor: colors.border, marginLeft: 52 },

  // Notifications
  notifBadge: {
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4,
  },
  notifBadgeText: { fontSize: 11, fontWeight: font.weights.bold },

  // About
  aboutText: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 12 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderRadius: 6, borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
    paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeText: { fontSize: 11, color: colors.purpleLight },
  logoutBtn: {
    borderWidth: 1, borderColor: 'rgba(255,59,48,0.3)',
    borderRadius: radius.lg, height: 52,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: font.weights.bold },
});
