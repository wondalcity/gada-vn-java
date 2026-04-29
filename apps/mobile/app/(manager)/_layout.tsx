import { Tabs, useRouter } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';
import { BackBtn, CloseBtn, GadaLogo } from '../../components/NavElements';

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

export default function ManagerLayout() {
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
            onPress={() => router.push('/(manager)/notifications')}
            style={{ marginRight: 16, padding: 4 }}
          >
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
        ),
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarLabel: t('manager.tab_home_label'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      {/* Sites */}
      <Tabs.Screen
        name="sites"
        options={{
          headerTitle: () => <GadaLogo />,
          headerTitleAlign: 'left',
          title: t('manager.tab_sites'),
          tabBarLabel: t('manager.tab_sites_label'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'business' : 'business-outline'} focused={focused} />,
        }}
      />
      {/* Jobs */}
      <Tabs.Screen
        name="index"
        options={{
          headerTitle: () => <GadaLogo />,
          headerTitleAlign: 'left',
          title: t('manager.tab_jobs'),
          tabBarLabel: t('manager.tab_jobs_label'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'briefcase' : 'briefcase-outline'} focused={focused} />,
        }}
      />
      {/* Hires */}
      <Tabs.Screen
        name="workers"
        options={{
          headerTitle: () => <GadaLogo />,
          headerTitleAlign: 'left',
          title: t('manager.tab_workers'),
          tabBarLabel: t('manager.tab_workers_label'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'people' : 'people-outline'} focused={focused} />,
        }}
      />
      {/* Contracts */}
      <Tabs.Screen
        name="contracts"
        options={{
          headerTitle: () => <GadaLogo />,
          headerTitleAlign: 'left',
          title: t('manager.tab_contracts'),
          tabBarLabel: t('manager.tab_contracts_label'),
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'document-text' : 'document-text-outline'} focused={focused} />,
        }}
      />
      {/* ── Hidden screens (platform-native back / close buttons) ── */}
      <Tabs.Screen
        name="notifications"
        options={{ href: null, title: t('manager.tab_notifications'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="settings"
        options={{ href: null, title: t('profile.settings'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null, title: t('manager.profile_title'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="jobs/[id]"
        options={{ href: null, title: t('manager.screen_job_detail'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="jobs/[id]/attendance"
        options={{ href: null, title: t('manager.screen_attendance'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="jobs/create"
        options={{ href: null, title: t('manager.screen_create_job'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <CloseBtn /> }}
      />
      <Tabs.Screen
        name="contracts/[id]"
        options={{ href: null, title: t('manager.screen_contract'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
      <Tabs.Screen
        name="register"
        options={{ href: null, title: t('manager.screen_register'), headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <CloseBtn /> }}
      />
      <Tabs.Screen
        name="sites/create"
        options={{ href: null, title: '현장 등록', headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <CloseBtn /> }}
      />
      <Tabs.Screen
        name="sites/[id]"
        options={{ href: null, title: '현장 상세', headerShown: true, tabBarStyle: { display: 'none' }, headerLeft: () => <BackBtn /> }}
      />
    </Tabs>
  );
}
