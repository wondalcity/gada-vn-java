import { Tabs, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors, Radius, Spacing } from '../../constants/theme';

// ── Tab icon pill (web-style: icon + bg pill when active) ──
function TabIcon({ name, focused }: { name: React.ComponentProps<typeof Ionicons>['name']; focused: boolean }) {
  return (
    <View style={[tabIcon.wrap, focused && tabIcon.active]}>
      <Ionicons name={name} size={22} color={focused ? Colors.primary : Colors.onSurfaceVariant} />
    </View>
  );
}

const tabIcon = StyleSheet.create({
  wrap: { width: 40, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: 'rgba(6,105,247,0.10)' },
});

/** GADA-style back button — circular surface container with platform arrow */
function BackBtn() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
      activeOpacity={0.7}
      style={btn.backWrap}
    >
      <View style={btn.circle}>
        <Text style={btn.backIcon}>
          {Platform.OS === 'ios' ? '‹' : '←'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/** GADA-style close button — circular surface container with × */
function CloseBtn() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 8 }}
      activeOpacity={0.7}
      style={btn.closeWrap}
    >
      <View style={btn.circle}>
        <Text style={btn.closeIcon}>✕</Text>
      </View>
    </TouchableOpacity>
  );
}

const btn = StyleSheet.create({
  backWrap:  { paddingLeft: Spacing.sm, paddingRight: Spacing.xs },
  closeWrap: { paddingLeft: Spacing.xs, paddingRight: Spacing.sm },
  circle: {
    width: 34, height: 34, borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    justifyContent: 'center', alignItems: 'center',
  },
  backIcon: {
    fontSize: Platform.OS === 'ios' ? 22 : 18,
    lineHeight: Platform.OS === 'ios' ? 26 : 22,
    color: Colors.onSurface,
    fontWeight: Platform.OS === 'ios' ? '300' : '400',
    marginTop: Platform.OS === 'ios' ? -1 : 0,
  },
  closeIcon: {
    fontSize: 14,
    lineHeight: 18,
    color: Colors.onSurface,
    fontWeight: '600',
  },
});

function GadaLogo() {
  return (
    <View style={logo.wrap}>
      <Text style={logo.sub}>가다</Text>
      <View style={logo.row}>
        <Text style={logo.main}>GADA</Text>
        <Text style={logo.vn}>vn</Text>
      </View>
    </View>
  );
}

const logo = StyleSheet.create({
  wrap: { flexDirection: 'column', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  sub: { fontSize: 9, color: Colors.primary, fontWeight: '700', letterSpacing: 1.5, lineHeight: 12 },
  main: { fontSize: 18, fontWeight: '900', color: Colors.primary, lineHeight: 22 },
  vn: { fontSize: 13, fontWeight: '400', color: Colors.onSurfaceVariant, lineHeight: 18 },
});

export default function WorkerLayout() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarStyle: { height: 60, paddingBottom: 8, backgroundColor: Colors.surface, borderTopColor: Colors.outline, borderTopWidth: 1 },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500', marginTop: 0 },
        headerStyle: { backgroundColor: Colors.surface },
        headerShadowVisible: true,
        headerTintColor: Colors.onSurface,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => router.push('/(worker)/notifications' as any)}
            style={{ marginRight: 16, padding: 4 }}
          >
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
        ),
      }}
    >
      {/* 홈 */}
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarLabel: t('landing.home'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />

      {/* 일자리 */}
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarLabel: t('jobs.tab_label'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} />,
        }}
      />

      {/* 지원현황 */}
      <Tabs.Screen
        name="work"
        options={{
          headerTitle: () => <GadaLogo />,
          headerTitleAlign: 'left',
          title: t('worker.work_tab_title'),
          tabBarLabel: t('worker.work_tab_label'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'document-text' : 'document-text-outline'} focused={focused} />,
        }}
      />

      {/* 출퇴근 */}
      <Tabs.Screen
        name="attendance"
        options={{
          headerTitle: () => <GadaLogo />,
          headerTitleAlign: 'left',
          title: t('attendance.title'),
          tabBarLabel: t('attendance.tab_label'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'calendar' : 'calendar-outline'} focused={focused} />,
        }}
      />

      {/* 마이페이지 */}
      <Tabs.Screen
        name="profile/index"
        options={{
          headerTitle: () => <GadaLogo />,
          headerTitleAlign: 'left',
          title: t('landing.mypage'),
          tabBarLabel: t('landing.mypage'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
        }}
      />

      {/* ── Hidden screens (all get platform-native back/close button) ── */}
      <Tabs.Screen
        name="notifications"
        options={{ href: null, title: t('notifications.title'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ href: null, title: t('profile.settings'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="jobs/[id]"
        options={{ href: null, title: t('manager.screen_job_detail'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="contracts/index"
        options={{ href: null, title: t('worker.contracts_list', '계약서 목록'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="contracts/[id]"
        options={{ href: null, title: t('manager.screen_contract'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="profile/edit"
        options={{ href: null, title: t('worker.section_basic', '프로필 편집'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <CloseBtn /> }}
      />
    </Tabs>
  );
}
