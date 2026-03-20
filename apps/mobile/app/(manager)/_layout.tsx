import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function ManagerLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#FF6B2C',
        tabBarInactiveTintColor: '#999',
        headerStyle: { backgroundColor: '#FF6B2C' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '일자리 관리',
          tabBarLabel: '현장',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏗️</Text>,
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
      <Tabs.Screen
        name="profile"
        options={{
          title: '프로필',
          tabBarLabel: '프로필',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
