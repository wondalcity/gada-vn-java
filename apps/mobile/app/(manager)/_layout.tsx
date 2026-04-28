import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function ManagerLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0669F7',
        tabBarInactiveTintColor: '#98A2B2',
        tabBarStyle: { height: 60, paddingBottom: 8, backgroundColor: '#fff', borderTopColor: '#EFF1F5' },
        headerStyle: { backgroundColor: '#1A1A2E' },
        headerTintColor: '#fff',
      }}
    >
      {/* Home — dashboard */}
      <Tabs.Screen
        name="home"
        options={{
          title: t('manager.tab_home'),
          tabBarLabel: t('manager.tab_home_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
        }}
      />
      {/* Sites */}
      <Tabs.Screen
        name="sites"
        options={{
          title: t('manager.tab_sites'),
          tabBarLabel: t('manager.tab_sites_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏗️</Text>,
        }}
      />
      {/* Jobs */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('manager.tab_jobs'),
          tabBarLabel: t('manager.tab_jobs_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      {/* Hires (채용 관리) */}
      <Tabs.Screen
        name="workers"
        options={{
          title: t('manager.tab_workers'),
          tabBarLabel: t('manager.tab_workers_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👷</Text>,
        }}
      />
      {/* Contracts */}
      <Tabs.Screen
        name="contracts"
        options={{
          title: t('manager.tab_contracts'),
          tabBarLabel: t('manager.tab_contracts_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📄</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: t('manager.tab_notifications'),
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      {/* Settings screen — hidden from tab bar */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
          title: t('profile.settings'),
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      {/* Non-tab screens — tab bar hidden, header back button shown */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: t('manager.profile_title'),
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
        }}
      />
      <Tabs.Screen
        name="jobs/[id]/attendance"
        options={{
          href: null,
          title: t('manager.screen_attendance'),
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="jobs/create"
        options={{
          href: null,
          title: t('manager.screen_create_job'),
          headerShown: true,
          tabBarStyle: { display: 'none' },
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
      <Tabs.Screen
        name="register"
        options={{
          href: null,
          title: t('manager.screen_register'),
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="sites/create"
        options={{
          href: null,
          title: '현장 등록',
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="sites/[id]"
        options={{
          href: null,
          title: '현장 상세',
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
