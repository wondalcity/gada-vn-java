import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function ManagerLayout() {
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
      <Tabs.Screen
        name="index"
        options={{
          title: t('manager.tab_jobs'),
          tabBarLabel: t('manager.tab_jobs_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="sites"
        options={{
          title: t('manager.tab_sites'),
          tabBarLabel: t('manager.tab_sites_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏗️</Text>,
        }}
      />
      <Tabs.Screen
        name="workers"
        options={{
          title: t('manager.tab_workers'),
          tabBarLabel: t('manager.tab_workers_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👷</Text>,
        }}
      />
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
          title: t('manager.tab_notifications'),
          tabBarLabel: t('manager.tab_notifications'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔔</Text>,
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
    </Tabs>
  );
}
