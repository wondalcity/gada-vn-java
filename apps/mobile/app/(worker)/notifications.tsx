import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function WorkerNotifications() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        keyExtractor={(item) => item}
        renderItem={() => null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>알림이 없습니다</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#999', fontSize: 15 },
});
