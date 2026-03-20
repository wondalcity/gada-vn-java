import { View, Text, StyleSheet } from 'react-native';

export default function ManagerNotifications() {
  return (
    <View style={styles.container}>
      <Text style={styles.empty}>알림이 없습니다</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#999', fontSize: 15 },
});
