import { Tabs, useRouter } from 'expo-router';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';

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

export default function ManagerLayout() {
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
            onPress={() => router.push('/(manager)/notifications')}
            style={{ marginRight: 16, padding: 4 }}
          >
            <Text style={{ fontSize: 22 }}>🔔</Text>
          </TouchableOpacity>
        ),
      }}
    >
      {/* Home — dashboard (custom header rendered inside screen) */}
      <Tabs.Screen
        name="home"
        options={{
          headerShown: false,
          tabBarLabel: t('manager.tab_home_label'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏠</Text>,
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
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏗️</Text>,
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
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📋</Text>,
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
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👷</Text>,
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
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📄</Text>,
        }}
      />
      {/* ── Hidden screens ── */}
      <Tabs.Screen
        name="notifications"
        options={{ href: null, title: t('manager.tab_notifications'), headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="settings"
        options={{ href: null, title: t('profile.settings'), headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="profile"
        options={{ href: null, title: t('manager.profile_title'), headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="jobs/[id]"
        options={{ href: null, title: t('manager.screen_job_detail'), headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="jobs/[id]/attendance"
        options={{ href: null, title: t('manager.screen_attendance'), headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="jobs/create"
        options={{ href: null, title: t('manager.screen_create_job'), headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="contracts/[id]"
        options={{ href: null, title: t('manager.screen_contract'), headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="register"
        options={{ href: null, title: t('manager.screen_register'), headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="sites/create"
        options={{ href: null, title: '현장 등록', headerShown: true, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="sites/[id]"
        options={{ href: null, title: '현장 상세', headerShown: true, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}
