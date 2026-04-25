import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Colors } from '../../constants/theme';

export default function AuthLayout() {
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.onSurface,
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitle: '',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="phone" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ title: '' }} />
      <Stack.Screen name="otp" options={{ title: t('auth.otp_title') }} />
      <Stack.Screen name="mode" options={{ headerShown: false }} />
      <Stack.Screen name="role" options={{ title: t('auth.role_select_title') }} />
    </Stack>
  );
}
