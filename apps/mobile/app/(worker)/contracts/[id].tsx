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
  manager_signed_at: string | null;
  worker_sig_url: string | null;
  manager_sig_url: string | null;
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
      Alert.alert(t('common.error'), t('contract.load_fail'), [
        { text: t('common.confirm'), onPress: () => router.back() },
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
      Alert.alert(t('contract.sign_complete_title'), t('contract.sign_complete_body'), [
        { text: t('common.confirm'), onPress: () => { load(); } },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : t('contract.sign_fail');
      Alert.alert(t('common.error'), msg);
    } finally {
      setSigning(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#FF6B2C" /></View>;
  }
  if (!contract) return null;

  const canWorkerSign = contract.status === 'PENDING_WORKER_SIGN';
  const workerSigned = !!contract.worker_signed_at;
  const managerSigned = !!contract.manager_signed_at;

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Contract HTML content */}
        <View style={styles.contractBox}>
          <Text style={styles.contractTitle}>{t('contract.title')}</Text>
          <View style={styles.divider} />
          <Text style={styles.contractText}>
            {contract.contract_html.replace(/<[^>]*>/g, '').trim()}
          </Text>
        </View>

        {/* Signature status card */}
        <View style={styles.sigCard}>
          <Text style={styles.sigCardTitle}>{t('contract.section_signature_status')}</Text>
          <View style={styles.sigRow}>
            {/* Worker signature box */}
            {canWorkerSign ? (
              <TouchableOpacity
                style={[styles.sigBox, styles.sigBoxActive]}
                onPress={() => setShowSignPad(true)}
                disabled={signing}
                activeOpacity={0.75}
              >
                <Text style={styles.sigBoxLabelActive}>{t('contract.worker_signature')}</Text>
                <View style={styles.sigIconActive}>
                  <Text style={{ fontSize: 20 }}>✍️</Text>
                </View>
                <Text style={styles.sigBoxCta}>{t('contract.sign_button')}</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.sigBox, workerSigned ? styles.sigBoxDone : styles.sigBoxWait]}>
                <Text style={[styles.sigBoxLabel, workerSigned && styles.sigBoxLabelDone]}>{t('contract.worker_signature')}</Text>
                <Text style={{ fontSize: 28, marginVertical: 4 }}>{workerSigned ? '✅' : '⏳'}</Text>
                <Text style={[styles.sigBoxStatus, workerSigned && styles.sigBoxStatusDone]}>
                  {workerSigned ? t('contract.signed') : t('contract.waiting')}
                </Text>
              </View>
            )}

            {/* Manager signature box — display only */}
            <View style={[styles.sigBox, managerSigned ? styles.sigBoxDone : styles.sigBoxWait]}>
              <Text style={[styles.sigBoxLabel, managerSigned && styles.sigBoxLabelDone]}>{t('contract.manager_signature')}</Text>
              <Text style={{ fontSize: 28, marginVertical: 4 }}>{managerSigned ? '✅' : '⏳'}</Text>
              <Text style={[styles.sigBoxStatus, managerSigned && styles.sigBoxStatusDone]}>
                {managerSigned ? t('contract.signed') : t('contract.waiting')}
              </Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

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
  const { t } = useTranslation();
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
        <Text style={sig.title}>{t('contract.sign_pad_title')}</Text>
        <Text style={sig.hint}>{t('contract.sign_pad_hint')}</Text>

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
            <Text style={sig.placeholder}>{t('contract.sign_pad_placeholder')}</Text>
          )}
        </View>

        <View style={sig.actions}>
          <TouchableOpacity style={sig.clearBtn} onPress={handleClear}>
            <Text style={sig.clearBtnText}>{t('contract.sign_pad_clear')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={sig.cancelBtn} onPress={onCancel}>
            <Text style={sig.cancelBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[sig.confirmBtn, !hasSignature && sig.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!hasSignature}
          >
            <Text style={sig.confirmBtnText}>{t('common.confirm')}</Text>
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
  contractBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  contractTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 16 },
  divider: { height: 1, backgroundColor: '#E0E0E0', marginBottom: 16 },
  contractText: { fontSize: 14, color: '#444', lineHeight: 22 },
  // Signature status card
  sigCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 12 },
  sigCardTitle: { fontSize: 14, fontWeight: '700', color: '#25282A', marginBottom: 12 },
  sigRow: { flexDirection: 'row', gap: 10 },
  sigBox: { flex: 1, borderRadius: 12, borderWidth: 2, padding: 12, alignItems: 'center', minHeight: 110, justifyContent: 'center' },
  sigBoxActive: { borderColor: '#0669F7', backgroundColor: '#EFF5FF' },
  sigBoxDone: { borderColor: '#86EFAC', backgroundColor: '#F0FDF4' },
  sigBoxWait: { borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderStyle: 'dashed' },
  sigBoxLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 4 },
  sigBoxLabelActive: { fontSize: 11, fontWeight: '700', color: '#0669F7', marginBottom: 4 },
  sigBoxLabelDone: { color: '#16A34A' },
  sigBoxCta: { fontSize: 12, fontWeight: '700', color: '#0669F7', marginTop: 4 },
  sigBoxStatus: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  sigBoxStatusDone: { color: '#16A34A' },
  sigIconActive: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0669F7', alignItems: 'center', justifyContent: 'center' },
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
