import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Text, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { BackBtn, GadaLogo } from '../../components/NavElements';

// Close button that always returns to the profile tab (fixes Tab navigator back-nav bug)
function ProfileEditCloseBtn() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.navigate({ pathname: '/(worker)/profile/index' } as any)}
      style={{ padding: 8, marginLeft: 4 }}
      hitSlop={8}
    >
      <Ionicons name="close" size={24} color={Colors.onSurface} />
    </TouchableOpacity>
  );
}

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12 }}>
            <TouchableOpacity onPress={() => Linking.openURL('tel:+84568240240')} style={{ padding: 4 }}>
              <Text style={{ fontSize: 22 }}>📞</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(worker)/notifications' as any)} style={{ padding: 4 }}>
              <Text style={{ fontSize: 22 }}>🔔</Text>
            </TouchableOpacity>
          </View>
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
        options={{ href: null, title: '프로필 관리', headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <ProfileEditCloseBtn /> }}
      />
    </Tabs>
  );
}
