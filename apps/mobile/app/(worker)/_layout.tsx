import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';

export default function WorkerLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B2C',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { height: 60, paddingBottom: 8 },
        headerStyle: { backgroundColor: '#FF6B2C' },
        headerTintColor: '#fff',
      }}
    >
      {/* 홈 — landing page */}
      <Tabs.Screen
        name="home"
        options={{
          title: t('landing.home'),
          tabBarLabel: t('landing.home'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />

      {/* 일자리 — job feed */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('jobs.nearby'),
          tabBarLabel: t('jobs.nearby'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏗️</Text>,
        }}
      />

      {/* 지원현황 */}
      <Tabs.Screen
        name="work"
        options={{
          title: t('manager.tab_workers'),
          tabBarLabel: t('manager.tab_workers_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />

      {/* 출퇴근 */}
      <Tabs.Screen
        name="attendance"
        options={{
          title: t('attendance.title'),
          tabBarLabel: t('attendance.title'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⏱️</Text>,
        }}
      />

      {/* 마이페이지 — replaces 프로필 tab, at rightmost */}
      <Tabs.Screen
        name="profile"
        options={{
          title: t('landing.mypage'),
          tabBarLabel: t('landing.mypage'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />

      {/* Hidden screens */}
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: t('notifications.title'),
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: t('profile.settings'),
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="jobs/[id]"
        options={{
          href: null,
          title: t('manager.screen_job_detail'),
          headerShown: true,
          tabBarStyle: { display: 'none' },
          headerLeft: undefined,
        }}
      />
      <Tabs.Screen
        name="contracts/[id]"
        options={{
          href: null,
          title: t('manager.screen_contract'),
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
