import { Tabs, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';

/** Platform-native back chevron/arrow for pushed depth screens */
function BackBtn() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={8}
      activeOpacity={0.6}
      style={{ paddingHorizontal: Platform.OS === 'ios' ? 8 : 4, paddingVertical: 4 }}
    >
      <Text style={{ fontSize: Platform.OS === 'ios' ? 32 : 24, lineHeight: Platform.OS === 'ios' ? 34 : 26, color: Colors.primary, fontWeight: Platform.OS === 'ios' ? '300' : '400' }}>
        {Platform.OS === 'ios' ? '‹' : '←'}
      </Text>
    </TouchableOpacity>
  );
}

/** X close button for modal-style screens */
function CloseBtn() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={8}
      activeOpacity={0.6}
      style={{ paddingHorizontal: Platform.OS === 'ios' ? 12 : 4, paddingVertical: 4 }}
    >
      <Text style={{ fontSize: 18, color: Colors.onSurface, lineHeight: 22 }}>✕</Text>
    </TouchableOpacity>
  );
}

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
        tabBarStyle: { height: 60, paddingBottom: 8, backgroundColor: Colors.surface, borderTopColor: Colors.outline },
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
      {/* 홈 — landing page (custom header inside screen) */}
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarLabel: t('landing.home'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />

      {/* 일자리 — job feed (custom WorkerHeader inside screen) */}
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarLabel: t('jobs.tab_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>💼</Text>,
        }}
      />

      {/* 지원현황 — Applications */}
      <Tabs.Screen
        name="work"
        options={{
          headerTitle: () => <GadaLogo />,
          headerTitleAlign: 'left',
          title: t('worker.work_tab_title'),
          tabBarLabel: t('worker.work_tab_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />

      {/* 출퇴근 — Attendance */}
      <Tabs.Screen
        name="attendance"
        options={{
          headerTitle: () => <GadaLogo />,
          headerTitleAlign: 'left',
          title: t('attendance.title'),
          tabBarLabel: t('attendance.tab_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⏱️</Text>,
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
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
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
