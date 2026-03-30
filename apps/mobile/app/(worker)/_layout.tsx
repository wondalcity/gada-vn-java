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
          tabBarLabel: '일자리',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏗️</Text>,
        }}
      />
      <Tabs.Screen
        name="work"
        options={{
          title: '지원현황',
          tabBarLabel: '지원현황',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="attendance"
        options={{
          title: '출퇴근',
          tabBarLabel: '출퇴근',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⏱️</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: t('notifications.title'),
          tabBarLabel: '알림',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔔</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('profile.title'),
          tabBarLabel: '프로필',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
      {/* Detail screens — hidden from tab bar */}
      <Tabs.Screen name="jobs/[id]" options={{ href: null }} />
      <Tabs.Screen name="contracts/[id]" options={{ href: null }} />
    </Tabs>
  );
}
