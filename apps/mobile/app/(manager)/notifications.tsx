import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function ManagerNotifications() {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      <Text style={styles.empty}>{t('common.no_notifications')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#999', fontSize: 15 },
});
