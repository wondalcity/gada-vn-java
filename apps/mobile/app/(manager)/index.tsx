import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

export default function ManagerDashboard() {
  return (
    <View style={styles.container}>
      <FlatList
        data={[]}
        keyExtractor={(item) => item}
        renderItem={() => null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>등록된 일자리가 없습니다</Text>
            <Text style={styles.hint}>아래 + 버튼으로 새 일자리를 등록하세요</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { color: '#999', fontSize: 15, marginBottom: 8 },
  hint: { color: '#bbb', fontSize: 13 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#FF6B2C', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#FF6B2C', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 28, lineHeight: 32 },
});
