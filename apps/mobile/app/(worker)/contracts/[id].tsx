import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../../lib/api-client';

interface Contract {
  id: string;
  status: string;
  contract_html: string;
  worker_signed_at: string | null;
  created_at: string;
}

export default function WorkerContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<Contract>(`/contracts/${id}`);
      setContract(data);
    } catch {
      Alert.alert('오류', '계약서를 불러올 수 없습니다.', [
        { text: '확인', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleSign(signatureData: string) {
    setShowSignPad(false);
    setSigning(true);
    try {
      await api.post(`/contracts/${id}/sign`, { signatureData });
      Alert.alert('서명 완료 ✅', '계약서에 서명이 완료되었습니다.', [
        { text: '확인', onPress: () => { load(); } },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '서명에 실패했습니다.';
      Alert.alert('오류', msg);
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B2C" /></View>;
  }
  if (!contract) return null;

  const isSigned = contract.status === 'FULLY_SIGNED';

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Status banner */}
        <View style={[styles.statusBanner, isSigned ? styles.statusSigned : styles.statusPending]}>
          <Text style={[styles.statusText, { color: isSigned ? '#2E7D32' : '#E65100' }]}>
            {isSigned ? '✅ 서명 완료' : '⏳ 서명 대기 중'}
          </Text>
          {isSigned && contract.worker_signed_at && (
            <Text style={styles.statusSub}>
              {new Date(contract.worker_signed_at).toLocaleString('ko-KR')}
            </Text>
          )}
        </View>

        {/* Contract HTML content */}
        <View style={styles.contractBox}>
          <Text style={styles.contractTitle}>근로계약서</Text>
          <View style={styles.divider} />
          {/* Render HTML as plain text — for production, use react-native-webview */}
          <Text style={styles.contractText}>
            {contract.contract_html.replace(/<[^>]*>/g, '').trim()}
          </Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sign CTA */}
      {!isSigned && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.signBtn, signing && styles.signBtnDisabled]}
            onPress={() => setShowSignPad(true)}
            disabled={signing}
          >
            {signing
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.signBtnText}>서명하기 ✍️</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* Signature pad modal */}
      {showSignPad && (
        <SignaturePadModal
          onConfirm={handleSign}
          onCancel={() => setShowSignPad(false)}
        />
      )}
    </>
  );
}

// ─── Signature Pad ────────────────────────────────────────────────────────────
// Simple drawn signature using touch events stored as SVG path data
interface SignaturePadProps {
  onConfirm: (signatureData: string) => void;
  onCancel: () => void;
}

function SignaturePadModal({ onConfirm, onCancel }: SignaturePadProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const hasSignature = paths.length > 0 || currentPath.length > 0;

  function handleTouchStart(e: { nativeEvent: { locationX: number; locationY: number } }) {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath(`M${locationX.toFixed(1)},${locationY.toFixed(1)}`);
  }

  function handleTouchMove(e: { nativeEvent: { locationX: number; locationY: number } }) {
    const { locationX, locationY } = e.nativeEvent;
    setCurrentPath((p) => `${p} L${locationX.toFixed(1)},${locationY.toFixed(1)}`);
  }

  function handleTouchEnd() {
    if (currentPath) {
      setPaths((p) => [...p, currentPath]);
      setCurrentPath('');
    }
  }

  function handleClear() {
    setPaths([]);
    setCurrentPath('');
  }

  function handleConfirm() {
    const svgData = `<svg viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">${
      [...paths, currentPath].filter(Boolean).map((d) => `<path d="${d}" stroke="#1A1A1A" stroke-width="2" fill="none"/>`).join('')
    }</svg>`;
    onConfirm(svgData);
  }

  return (
    <View style={sig.overlay}>
      <View style={sig.modal}>
        <Text style={sig.title}>서명</Text>
        <Text style={sig.hint}>아래 영역에 서명해 주세요</Text>

        <View
          style={sig.canvas}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(e) => handleTouchStart(e)}
          onResponderMove={(e) => handleTouchMove(e)}
          onResponderRelease={() => handleTouchEnd()}
        >
          {/* Visual strokes using positioned views */}
          {!hasSignature && (
            <Text style={sig.placeholder}>← 여기에 서명하세요</Text>
          )}
        </View>

        <View style={sig.actions}>
          <TouchableOpacity style={sig.clearBtn} onPress={handleClear}>
            <Text style={sig.clearBtnText}>다시 쓰기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={sig.cancelBtn} onPress={onCancel}>
            <Text style={sig.cancelBtnText}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[sig.confirmBtn, !hasSignature && sig.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!hasSignature}
          >
            <Text style={sig.confirmBtnText}>확인</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingBottom: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statusBanner: { borderRadius: 12, padding: 16, marginBottom: 12, alignItems: 'center' },
  statusSigned: { backgroundColor: '#E8F5E9' },
  statusPending: { backgroundColor: '#FFF3E0' },
  statusText: { fontSize: 16, fontWeight: '700' },
  statusSub: { fontSize: 12, color: '#888', marginTop: 4 },
  contractBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  contractTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginBottom: 16 },
  contractText: { fontSize: 14, color: '#444', lineHeight: 22 },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', padding: 16, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#F0F0F0',
  },
  signBtn: {
    backgroundColor: '#FF6B2C', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  signBtnDisabled: { backgroundColor: '#ccc' },
  signBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});

const sig = StyleSheet.create({
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  hint: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 16 },
  canvas: {
    height: 160, borderWidth: 1, borderColor: '#E0E0E0',
    borderRadius: 12, backgroundColor: '#FAFAFA',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  placeholder: { color: '#CCC', fontSize: 14 },
  actions: { flexDirection: 'row', gap: 8 },
  clearBtn: {
    paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1,
    borderColor: '#E0E0E0', borderRadius: 10, alignItems: 'center',
  },
  clearBtnText: { color: '#666', fontWeight: '600' },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderWidth: 1,
    borderColor: '#E0E0E0', borderRadius: 10, alignItems: 'center',
  },
  cancelBtnText: { color: '#555', fontWeight: '600' },
  confirmBtn: {
    flex: 1, backgroundColor: '#FF6B2C', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center',
  },
  confirmBtnDisabled: { backgroundColor: '#ccc' },
  confirmBtnText: { color: '#fff', fontWeight: '700' },
});
