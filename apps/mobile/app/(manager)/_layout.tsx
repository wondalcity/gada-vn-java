import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function ManagerLayout() {
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
          title: '공고 관리',
          tabBarLabel: '공고',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="sites"
        options={{
          title: '현장 관리',
          tabBarLabel: '현장',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏗️</Text>,
        }}
      />
      <Tabs.Screen
        name="workers"
        options={{
          title: '채용 관리',
          tabBarLabel: '채용',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👷</Text>,
        }}
      />
      <Tabs.Screen
        name="contracts"
        options={{
          title: '계약 관리',
          tabBarLabel: '계약',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📄</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '알림',
          tabBarLabel: '알림',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔔</Text>,
        }}
      />
      {/* Non-tab screens — tab bar hidden, header back button shown */}
      <Tabs.Screen
        name="profile"
        options={{
          href: null,
          title: '프로필',
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="jobs/[id]"
        options={{
          href: null,
          title: '공고 상세',
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="jobs/[id]/attendance"
        options={{
          href: null,
          title: '출퇴근 관리',
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="jobs/create"
        options={{
          href: null,
          title: '공고 등록',
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="contracts/[id]"
        options={{
          href: null,
          title: '계약서',
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="register"
        options={{
          href: null,
          title: '관리자 등록',
          headerShown: true,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
