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
      <Tabs.Screen
        name="index"
        options={{
          title: t('jobs.nearby'),
          tabBarLabel: t('jobs.nearby'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏗️</Text>,
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: t('manager.tab_workers'),
          tabBarLabel: t('manager.tab_workers_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: t('attendance.title'),
          tabBarLabel: t('attendance.title'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⏱️</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('notifications.title'),
          tabBarLabel: t('notifications.title'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔔</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarLabel: t('profile.title'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
      {/* Detail screens — hidden from tab bar, back button shown in header */}
      <Tabs.Screen
        name="jobs/[id]"
        options={{
          href: null,
          title: t('manager.screen_job_detail'),
          headerShown: true,
          tabBarStyle: { display: 'none' },
          headerLeft: undefined, // use default Expo back button
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
