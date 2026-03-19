import React, { useEffect, useState } from 'react';
import {
  View, Text, Switch, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, ActivityIndicator, Alert,
  Platform, StatusBar,
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

  const handleWipeAll = () => {
    Alert.alert(
      'Wipe all data',
      'This will permanently erase all messages and sessions on ALL your devices. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe everything',
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            navigation.replace('Login');
          },
        },
      ],
    );
  };

  const logout = async () => {
    Alert.alert(
      'Sign out',
      'You will need to log in again to access your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: async () => {
            await clearSession();
            navigation.replace('Login');
          },
        },
      ],
    );
  };

  /* ── Reusable row component ── */
  const SettingsRow = ({
    icon,
    iconBg,
    title,
    subtitle,
    right,
    onPress,
    isLast = false,
  }: {
    icon: string;
    iconBg: string;
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    onPress?: () => void;
    isLast?: boolean;
  }) => {
    const content = (
      <View style={[styles.row, !isLast && styles.rowBorder]}>
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Text style={styles.rowIconText}>{icon}</Text>
        </View>
        <View style={styles.rowContent}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
        </View>
        {right || (
          onPress ? <Text style={styles.chevron}>{'\u203A'}</Text> : null
        )}
      </View>
    );
    if (onPress) {
      return <TouchableOpacity activeOpacity={0.6} onPress={onPress}>{content}</TouchableOpacity>;
    }
    return content;
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backIcon}>{'\u2039'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile card ── */}
        <TouchableOpacity activeOpacity={0.7} style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: getAvatarColor(username) }]}>
            <Text style={styles.avatarText}>{getInitials(username)}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{username}</Text>
            <Text style={styles.profileSub}>Hysj account</Text>
          </View>
          <Text style={styles.chevron}>{'\u203A'}</Text>
        </TouchableOpacity>

        {/* ── Devices ── */}
        <Text style={styles.sectionLabel}>DEVICES</Text>
        <View style={styles.card}>
          {loadingDevices ? (
            <ActivityIndicator color={colors.purple} style={{ paddingVertical: 20 }} />
          ) : devices.length === 0 ? (
            <Text style={styles.emptyText}>No devices linked</Text>
          ) : (
            devices.map((device, i) => (
              <View key={device.id} style={[styles.deviceRow, i < devices.length - 1 && styles.rowBorder]}>
                <View style={styles.deviceIconWrap}>
                  <Text style={styles.deviceIconText}>
                    {device.deviceName.toLowerCase().includes('mobile') ? '\u{1F4F1}' : '\u{1F4BB}'}
                  </Text>
                </View>
                <View style={styles.deviceInfo}>
                  <View style={styles.deviceNameRow}>
                    <Text style={styles.deviceName} numberOfLines={1}>{device.deviceName}</Text>
                    {device.id === currentDeviceId && (
                      <View style={styles.thisBadge}>
                        <Text style={styles.thisBadgeText}>This device</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.deviceMeta}>
                    <View style={[styles.dot, { backgroundColor: device.isOnline ? colors.online : colors.textMuted }]} />
                    <Text style={styles.deviceStatus}>
                      {device.isOnline ? 'Online' : formatLastActive(device.lastActiveAt)}
                    </Text>
                  </View>
                </View>
                {device.id !== currentDeviceId && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleDeleteDevice(device)}
                    activeOpacity={0.6}
                  >
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        {/* ── Security ── */}
        <Text style={styles.sectionLabel}>SECURITY</Text>
        <View style={styles.card}>
          <SettingsRow
            icon={'\u{1F512}'}
            iconBg="rgba(124,58,237,0.15)"
            title="Two-factor authentication"
            subtitle={is2FA ? 'Enabled' : 'Disabled'}
            right={
              <Switch
                value={is2FA}
                onValueChange={setIs2FA}
                trackColor={{ false: colors.border, true: colors.purple }}
                thumbColor={colors.white}
              />
            }
            isLast={false}
          />
          <SettingsRow
            icon={'\u{1F6E1}'}
            iconBg="rgba(16,185,129,0.15)"
            title="Security details"
            subtitle="Encryption keys and verification"
            onPress={() => navigation.navigate('Security')}
            isLast={true}
          />
        </View>

        {/* ── Notifications ── */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <SettingsRow
            icon={'\u{1F514}'}
            iconBg="rgba(245,158,11,0.15)"
            title="Push notifications"
            subtitle={pushToken ? 'Receiving alerts' : 'Not registered'}
            right={
              <View style={[
                styles.statusBadge,
                { backgroundColor: pushToken ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.12)' },
              ]}>
                <View style={[styles.statusDotSmall, { backgroundColor: pushToken ? colors.online : colors.danger }]} />
                <Text style={[styles.statusBadgeText, { color: pushToken ? colors.online : colors.danger }]}>
                  {pushToken ? 'ON' : 'OFF'}
                </Text>
              </View>
            }
            isLast={true}
          />
        </View>

        {/* ── About ── */}
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.card}>
          <Text style={styles.aboutText}>
            Hysj uses Signal Protocol, post-quantum cryptography, sealed sender, and 3-hop onion routing. Nothing is stored. Everything is deleted after delivery.
          </Text>
          <View style={styles.tagRow}>
            {[
              { label: 'Double Ratchet', icon: '\u{1F504}' },
              { label: 'Post-Quantum', icon: '\u269B' },
              { label: 'Sealed Sender', icon: '\u{1F575}' },
              { label: 'Onion Routing', icon: '\u{1F9C5}' },
            ].map(tag => (
              <View key={tag.label} style={styles.tag}>
                <Text style={styles.tagIcon}>{tag.icon}</Text>
                <Text style={styles.tagText}>{tag.label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.versionRow}>
            <Text style={styles.versionText}>Hysj v1.0.0</Text>
          </View>
        </View>

        {/* ── Danger zone ── */}
        <Text style={styles.dangerLabel}>DANGER ZONE</Text>
        <View style={styles.dangerCard}>
          <TouchableOpacity
            style={styles.dangerRow}
            onPress={logout}
            activeOpacity={0.6}
          >
            <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
              <Text style={styles.rowIconText}>{'\u{1F6AA}'}</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.dangerRowTitle}>Sign out</Text>
              <Text style={styles.dangerRowSub}>Log out of this device</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.danger }]}>{'\u203A'}</Text>
          </TouchableOpacity>

          <View style={styles.dangerDivider} />

          <TouchableOpacity
            style={styles.dangerRow}
            onPress={handleWipeAll}
            activeOpacity={0.6}
          >
            <View style={[styles.rowIcon, { backgroundColor: 'rgba(255,59,48,0.12)' }]}>
              <Text style={styles.rowIconText}>{'\u{1F5D1}'}</Text>
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.dangerRowTitle}>Wipe all data</Text>
              <Text style={styles.dangerRowSub}>Erase everything on all devices</Text>
            </View>
            <Text style={[styles.chevron, { color: colors.danger }]}>{'\u203A'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with privacy in mind</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 8 : 8,
    paddingBottom: 12,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: colors.white,
    marginTop: -2,
    fontWeight: font.weights.regular,
  },
  headerTitle: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.bold,
    color: colors.textPrimary,
    letterSpacing: 0.3,
  },

  /* ── Scroll ── */
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 40,
  },

  /* ── Profile ── */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: font.sizes.xl,
    fontWeight: font.weights.bold,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: font.sizes.lg,
    fontWeight: font.weights.bold,
    color: colors.textPrimary,
  },
  profileSub: {
    fontSize: font.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: colors.textMuted,
    fontWeight: font.weights.regular,
  },

  /* ── Section label ── */
  sectionLabel: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.bold,
    color: colors.textMuted,
    letterSpacing: 1.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },

  /* ── Card ── */
  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  /* ── Row ── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowIconText: {
    fontSize: 16,
  },
  rowContent: {
    flex: 1,
  },
  rowTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: font.sizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  /* ── Devices ── */
  emptyText: {
    color: colors.textMuted,
    fontSize: font.sizes.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  deviceIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(124,58,237,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  deviceIconText: {
    fontSize: 18,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deviceName: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  thisBadge: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  thisBadgeText: {
    fontSize: 10,
    color: colors.online,
    fontWeight: font.weights.semibold,
  },
  deviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deviceStatus: {
    fontSize: font.sizes.xs,
    color: colors.textSecondary,
  },
  removeBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  removeBtnText: {
    fontSize: font.sizes.xs,
    color: colors.danger,
    fontWeight: font.weights.semibold,
  },

  /* ── Status badge ── */
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  statusDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.bold,
  },

  /* ── About ── */
  aboutText: {
    fontSize: font.sizes.sm,
    color: colors.textSecondary,
    lineHeight: 20,
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: 12,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingBottom: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 4,
  },
  tagIcon: {
    fontSize: 12,
  },
  tagText: {
    fontSize: 11,
    color: colors.purpleLight,
    fontWeight: font.weights.medium,
  },
  versionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    alignItems: 'center',
  },
  versionText: {
    fontSize: font.sizes.xs,
    color: colors.textMuted,
  },

  /* ── Danger zone ── */
  dangerLabel: {
    fontSize: font.sizes.xs,
    fontWeight: font.weights.bold,
    color: colors.danger,
    letterSpacing: 1.5,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: 4,
    opacity: 0.8,
  },
  dangerCard: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
    overflow: 'hidden',
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  dangerDivider: {
    height: 1,
    backgroundColor: 'rgba(255,59,48,0.12)',
    marginLeft: 60,
  },
  dangerRowTitle: {
    fontSize: font.sizes.md,
    fontWeight: font.weights.semibold,
    color: colors.danger,
  },
  dangerRowSub: {
    fontSize: font.sizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },

  /* ── Footer ── */
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontSize: font.sizes.xs,
    color: colors.textDim,
  },
});
