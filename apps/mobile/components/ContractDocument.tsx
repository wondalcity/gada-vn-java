import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtVND(n?: number | null): string {
  if (n == null) return '-';
  return n.toLocaleString('ko-KR') + ' VND';
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(dateStr?: string | null, locale = 'ko'): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();
  if (locale === 'ko') return `${year}년 ${mon} ${d.getDate()}일`;
  return `${day}/${mon}/${year}`;
}

// ─── Contract strings (3 languages) ──────────────────────────────────────────

const CONTRACT_STRINGS = {
  ko: {
    brand_sub: '베트남 건설 근로자 매칭 플랫폼', title: '근 로 계 약 서',
    contract_no: '계약번호', issued_date: '발행일',
    intro: '근로자(이하 "갑")와 건설사(이하 "을")는 아래와 같이 근로계약을 체결하고 이를 성실히 이행할 것을 확약합니다.',
    sec_site: '■ 현장 정보', label_site_name: '현장명', label_site_addr: '현장 주소',
    sec_work: '■ 근무 조건', label_job: '업무 내용', label_work_date: '근무 일자',
    label_work_time: '근무 시간', label_wage: '일당', label_pay_method: '임금 지급',
    pay_method_val: '근로 완료 후 당일 또는 익영업일 내 지급',
    sec_worker: '■ 근로자 정보 (갑)', label_name: '성명', label_phone: '연락처',
    sec_company: '■ 건설사 정보 (을)', label_company: '건설사명', label_contact: '담당자',
    terms_title: '■ 계약 조건 및 준수 사항',
    terms: [
      '근로자는 지정된 근무 시간에 현장에 출근하여 성실하게 근무하여야 합니다.',
      '건설사는 근로기준법에 따라 안전한 근무 환경을 제공하여야 합니다.',
      '합의된 일당은 근로 완료 확인 후 지체 없이 지급합니다.',
      '근로자 또는 건설사의 귀책 사유로 인한 계약 불이행 시 GADA 플랫폼 운영 정책에 따릅니다.',
      '본 계약에 명시되지 않은 사항은 근로기준법 및 관련 법령에 따릅니다.',
    ],
    sig_title: '■ 서명란',
    party_a: '갑 (근로자)', party_b: '을 (건설사)',
    name_prefix: '성명', company_prefix: '건설사', manager_prefix: '담당관리자',
    sig_done: '서명 완료', sig_pending: '서명 대기 중', sig_date: '서명일', stamp_date: '날인일',
    footer: '본 계약서는 GADA 플랫폼(gada.vn)을 통해 전자적으로 체결되었습니다.',
    contract_no_label: '계약번호',
    lang_label: '계약서 언어',
  },
  vi: {
    brand_sub: 'Nền tảng kết nối lao động xây dựng Việt Nam', title: 'HỢP ĐỒNG LAO ĐỘNG',
    contract_no: 'Số hợp đồng', issued_date: 'Ngày phát hành',
    intro: 'Người lao động (gọi là "Bên A") và công ty xây dựng (gọi là "Bên B") đồng ý ký kết hợp đồng lao động theo các điều khoản dưới đây và cam kết thực hiện đầy đủ.',
    sec_site: '■ Thông tin công trường', label_site_name: 'Tên công trường', label_site_addr: 'Địa chỉ công trường',
    sec_work: '■ Điều kiện làm việc', label_job: 'Nội dung công việc', label_work_date: 'Ngày làm việc',
    label_work_time: 'Giờ làm việc', label_wage: 'Lương ngày', label_pay_method: 'Thanh toán lương',
    pay_method_val: 'Thanh toán trong ngày hoặc ngày làm việc tiếp theo sau khi hoàn thành công việc',
    sec_worker: '■ Thông tin người lao động (Bên A)', label_name: 'Họ và tên', label_phone: 'Số điện thoại',
    sec_company: '■ Thông tin công ty xây dựng (Bên B)', label_company: 'Tên công ty', label_contact: 'Người phụ trách',
    terms_title: '■ Điều khoản và điều kiện hợp đồng',
    terms: [
      'Người lao động phải đến công trường đúng giờ làm việc đã quy định và làm việc nghiêm túc.',
      'Công ty xây dựng phải cung cấp môi trường làm việc an toàn theo quy định của Bộ luật Lao động.',
      'Tiền lương ngày đã thỏa thuận sẽ được thanh toán ngay sau khi xác nhận hoàn thành công việc.',
      'Trường hợp vi phạm hợp đồng do lỗi của người lao động hoặc công ty xây dựng, sẽ xử lý theo chính sách vận hành của nền tảng GADA.',
      'Các vấn đề không được đề cập trong hợp đồng này sẽ tuân theo Bộ luật Lao động và các quy định pháp luật liên quan.',
    ],
    sig_title: '■ Ký tên',
    party_a: 'Bên A (Người lao động)', party_b: 'Bên B (Công ty XD)',
    name_prefix: 'Họ tên', company_prefix: 'Công ty', manager_prefix: 'Quản lý phụ trách',
    sig_done: 'Đã ký', sig_pending: 'Đang chờ ký', sig_date: 'Ngày ký', stamp_date: 'Ngày đóng dấu',
    footer: 'Hợp đồng này được ký kết điện tử thông qua nền tảng GADA (gada.vn).',
    contract_no_label: 'Số hợp đồng',
    lang_label: 'Ngôn ngữ hợp đồng',
  },
  en: {
    brand_sub: 'Vietnam Construction Worker Matching Platform', title: 'LABOR CONTRACT',
    contract_no: 'Contract No.', issued_date: 'Issued Date',
    intro: 'The worker (hereinafter "Party A") and the construction company (hereinafter "Party B") agree to enter into this labor contract under the terms set forth below and pledge to fulfill all obligations in good faith.',
    sec_site: '■ Site Information', label_site_name: 'Site Name', label_site_addr: 'Site Address',
    sec_work: '■ Work Conditions', label_job: 'Job Description', label_work_date: 'Work Date',
    label_work_time: 'Work Hours', label_wage: 'Daily Wage', label_pay_method: 'Wage Payment',
    pay_method_val: 'Paid on the day of work completion or the following business day',
    sec_worker: '■ Worker Information (Party A)', label_name: 'Full Name', label_phone: 'Phone',
    sec_company: '■ Company Information (Party B)', label_company: 'Company Name', label_contact: 'Contact Person',
    terms_title: '■ Contract Terms and Conditions',
    terms: [
      'The worker must report to the worksite at the designated work hours and perform duties diligently.',
      'The construction company must provide a safe working environment in accordance with the Labor Code.',
      'The agreed daily wage will be paid promptly after confirmation of work completion.',
      'In the event of contract breach by either the worker or the company, the GADA platform operating policy shall apply.',
      'Matters not specified in this contract shall be governed by the Labor Code and applicable laws.',
    ],
    sig_title: '■ Signatures',
    party_a: 'Party A (Worker)', party_b: 'Party B (Company)',
    name_prefix: 'Name', company_prefix: 'Company', manager_prefix: 'Manager',
    sig_done: 'Signed', sig_pending: 'Pending Signature', sig_date: 'Signed Date', stamp_date: 'Stamped Date',
    footer: 'This contract was concluded electronically via the GADA platform (gada.vn).',
    contract_no_label: 'Contract No.',
    lang_label: 'Contract Language',
  },
} as const;

type SupportedLang = keyof typeof CONTRACT_STRINGS;

// ─── Contract interface ───────────────────────────────────────────────────────

export interface MobileContract {
  id: string;
  status: string;
  createdAt: string;
  workerSignedAt?: string | null;
  managerSignedAt?: string | null;
  workerSigUrl?: string | null;
  managerSigUrl?: string | null;
  companySigUrl?: string | null;
  jobTitle?: string;
  workDate?: string;
  dailyWage?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  siteName?: string;
  siteAddress?: string | null;
  workerName?: string | null;
  workerPhone?: string | null;
  managerName?: string | null;
  managerPhone?: string | null;
  companyName?: string | null;
  companyContactName?: string | null;
  companyContactPhone?: string | null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <View style={doc.row}>
      <View style={doc.rowLabel}>
        <Text style={doc.rowLabelText}>{label}</Text>
      </View>
      <View style={doc.rowValue}>
        {typeof value === 'string' ? (
          <Text style={doc.rowValueText}>{value}</Text>
        ) : value}
      </View>
    </View>
  );
}

function SectionHeader({ children }: { children: string }) {
  return (
    <View style={doc.sectionHeader}>
      <Text style={doc.sectionHeaderText}>{children}</Text>
    </View>
  );
}

// ─── Main Contract Document ───────────────────────────────────────────────────

interface ContractDocumentProps {
  contract: MobileContract;
}

export function ContractDocument({ contract }: ContractDocumentProps) {
  const [lang, setLang] = useState<SupportedLang>('ko');
  const [saving, setSaving] = useState(false);
  const s = CONTRACT_STRINGS[lang];
  const docRef = useRef<View>(null);

  async function handleSaveImage() {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        lang === 'ko' ? '권한 필요' : lang === 'vi' ? 'Cần quyền' : 'Permission required',
        lang === 'ko' ? '갤러리 저장을 위해 권한이 필요합니다.' : lang === 'vi' ? 'Cần quyền truy cập để lưu ảnh.' : 'Gallery permission is required to save the image.',
      );
      return;
    }
    try {
      setSaving(true);
      const uri = await captureRef(docRef, { format: 'jpg', quality: 0.95 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert(
        lang === 'ko' ? '저장 완료' : lang === 'vi' ? 'Đã lưu' : 'Saved',
        lang === 'ko' ? '계약서가 갤러리에 저장되었습니다.' : lang === 'vi' ? 'Hợp đồng đã được lưu vào thư viện ảnh.' : 'Contract saved to gallery.',
      );
    } catch {
      Alert.alert(
        lang === 'ko' ? '오류' : 'Error',
        lang === 'ko' ? '이미지 저장에 실패했습니다.' : lang === 'vi' ? 'Lưu ảnh thất bại.' : 'Failed to save image.',
      );
    } finally {
      setSaving(false);
    }
  }
  const contractNo = contract.id.slice(0, 8).toUpperCase();
  const issuedDate = formatDate(contract.createdAt, lang);
  const sigSrc = contract.companySigUrl ?? contract.managerSigUrl;

  return (
    <View>
      {/* Toolbar: language selector + save button */}
      <View style={doc.toolbar}>
        <View style={doc.langSelector}>
          <Text style={doc.langLabel}>{s.lang_label}</Text>
          <View style={doc.langBtnRow}>
          {(['ko', 'vi', 'en'] as SupportedLang[]).map((l, i) => {
            const labels = { ko: '한국어', vi: 'Tiếng Việt', en: 'English' };
            const isFirst = i === 0;
            const isLast = i === 2;
            return (
              <TouchableOpacity
                key={l}
                style={[
                  doc.langBtn,
                  lang === l && doc.langBtnActive,
                  isFirst && doc.langBtnFirst,
                  isLast && doc.langBtnLast,
                ]}
                onPress={() => setLang(l)}
                activeOpacity={0.75}
              >
                <Text style={[doc.langBtnText, lang === l && doc.langBtnTextActive]}>
                  {labels[l]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        </View>
        {/* Save as image button */}
        <TouchableOpacity
          style={[doc.saveBtn, saving && doc.saveBtnDisabled]}
          onPress={handleSaveImage}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={doc.saveBtnText}>
            {saving
              ? (lang === 'ko' ? '저장 중...' : lang === 'vi' ? 'Đang lưu...' : 'Saving...')
              : (lang === 'ko' ? '📥 이미지로 저장' : lang === 'vi' ? '📥 Lưu hình ảnh' : '📥 Save as image')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Document body */}
      <View ref={docRef} collapsable={false} style={doc.docBody}>
        {/* Header */}
        <View style={doc.header}>
          <View style={doc.brandRow}>
            <Text style={doc.brandName}>GADA</Text>
            <Text style={doc.brandSub}> {s.brand_sub}</Text>
          </View>
          <View style={doc.titleBox}>
            <Text style={doc.titleText}>{s.title}</Text>
          </View>
          <View style={doc.metaRow}>
            <Text style={doc.metaText}>{s.contract_no}: {contractNo}</Text>
            <Text style={doc.metaText}>{s.issued_date}: {issuedDate}</Text>
          </View>
        </View>

        {/* Intro */}
        <Text style={doc.intro}>{s.intro}</Text>

        {/* Detail table */}
        <View style={doc.table}>
          <SectionHeader>{s.sec_site}</SectionHeader>
          <Row label={s.label_site_name} value={contract.siteName ?? '-'} />
          {!!contract.siteAddress && <Row label={s.label_site_addr} value={contract.siteAddress} />}

          <SectionHeader>{s.sec_work}</SectionHeader>
          <Row label={s.label_job} value={contract.jobTitle ?? '-'} />
          <Row label={s.label_work_date} value={formatDate(contract.workDate, lang)} />
          {(contract.startTime || contract.endTime) && (
            <Row label={s.label_work_time} value={`${contract.startTime ?? '00:00'} ~ ${contract.endTime ?? '00:00'}`} />
          )}
          <Row
            label={s.label_wage}
            value={<Text style={doc.wageText}>{fmtVND(contract.dailyWage)}</Text>}
          />
          <Row label={s.label_pay_method} value={s.pay_method_val} />

          <SectionHeader>{s.sec_worker}</SectionHeader>
          <Row label={s.label_name} value={contract.workerName ?? '-'} />
          {!!contract.workerPhone && <Row label={s.label_phone} value={contract.workerPhone} />}

          <SectionHeader>{s.sec_company}</SectionHeader>
          {contract.companyName ? (
            <>
              <Row label={s.label_company} value={contract.companyName} />
              {!!contract.companyContactName && <Row label={s.label_contact} value={contract.companyContactName} />}
              {!!contract.companyContactPhone && <Row label={s.label_phone} value={contract.companyContactPhone} />}
            </>
          ) : (
            <>
              <Row label={s.label_name} value={contract.managerName ?? '-'} />
              {!!contract.managerPhone && <Row label={s.label_phone} value={contract.managerPhone} />}
            </>
          )}
        </View>

        {/* Terms */}
        <View style={doc.termsBox}>
          <Text style={doc.termsTitle}>{s.terms_title}</Text>
          {s.terms.map((term, i) => (
            <View key={i} style={doc.termRow}>
              <Text style={doc.termNum}>{i + 1}.</Text>
              <Text style={doc.termText}>{term}</Text>
            </View>
          ))}
        </View>

        {/* Signatures */}
        <View style={doc.sigBox}>
          <Text style={doc.sigTitle}>{s.sig_title}</Text>
          <View style={doc.sigRow}>
            {/* Worker */}
            <View style={doc.sigParty}>
              <Text style={doc.sigPartyLabel}>{s.party_a}</Text>
              <Text style={doc.sigPartyName}>{s.name_prefix}: {contract.workerName ?? '________________'}</Text>
              <View style={doc.sigImageBox}>
                {contract.workerSigUrl ? (
                  <Image source={{ uri: contract.workerSigUrl }} style={doc.sigImage} contentFit="contain" />
                ) : contract.workerSignedAt ? (
                  <Text style={doc.sigDoneText}>✓ {s.sig_done}</Text>
                ) : (
                  <Text style={doc.sigPendingText}>{s.sig_pending}</Text>
                )}
              </View>
              {contract.workerSignedAt && (
                <Text style={doc.sigDateText}>{s.sig_date}: {formatDate(contract.workerSignedAt, lang)}</Text>
              )}
            </View>

            {/* Manager/Company */}
            <View style={doc.sigParty}>
              <Text style={doc.sigPartyLabel}>{s.party_b}</Text>
              <Text style={doc.sigPartyName}>
                {contract.companyName
                  ? `${s.company_prefix}: ${contract.companyName}`
                  : `${s.manager_prefix}: ${contract.managerName ?? '________________'}`}
              </Text>
              <View style={doc.sigImageBox}>
                {sigSrc ? (
                  <Image source={{ uri: sigSrc }} style={doc.sigImage} contentFit="contain" />
                ) : (
                  <Text style={doc.sigPendingText}>{s.sig_pending}</Text>
                )}
              </View>
              {contract.managerSignedAt && sigSrc && (
                <Text style={doc.sigDateText}>{s.stamp_date}: {formatDate(contract.managerSignedAt, lang)}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Footer */}
        <Text style={doc.footer}>{s.footer} · {s.contract_no_label}: {contractNo}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const doc = StyleSheet.create({
  // Toolbar
  toolbar: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  // Language selector
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  langLabel: { fontSize: 12, color: '#7A7B7A' },
  langBtnRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    overflow: 'hidden',
  },
  langBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  langBtnFirst: { borderTopLeftRadius: 7, borderBottomLeftRadius: 7 },
  langBtnLast: { borderTopRightRadius: 7, borderBottomRightRadius: 7 },
  langBtnActive: { backgroundColor: '#0669F7' },
  langBtnText: { fontSize: 12, fontWeight: '500', color: '#7A7B7A' },
  langBtnTextActive: { color: '#fff', fontWeight: '600' },
  // Save button
  saveBtn: {
    backgroundColor: '#0669F7',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#99C0FB' },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  // Document body
  docBody: { backgroundColor: '#fff', borderRadius: 8, padding: 16 },
  // Header
  header: { alignItems: 'center', marginBottom: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  brandName: { fontSize: 18, fontWeight: '900', color: '#0669F7', letterSpacing: -0.5 },
  brandSub: { fontSize: 9, color: '#666', flexShrink: 1 },
  titleBox: {
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#1a4fa0',
    paddingHorizontal: 20,
    paddingVertical: 5,
    marginBottom: 8,
  },
  titleText: { fontSize: 14, fontWeight: '800', letterSpacing: 3, color: '#1a4fa0', textAlign: 'center' },
  metaRow: { flexDirection: 'row', gap: 16 },
  metaText: { fontSize: 10, color: '#888' },
  // Intro
  intro: { fontSize: 11, lineHeight: 18, color: '#444', marginBottom: 12 },
  // Table
  table: { borderWidth: 1, borderColor: '#CCCCCC', marginBottom: 12 },
  sectionHeader: { backgroundColor: '#1a4fa0', paddingHorizontal: 10, paddingVertical: 6 },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#CCCCCC' },
  rowLabel: {
    width: '35%',
    backgroundColor: '#F5F7FA',
    borderRightWidth: 1,
    borderColor: '#CCCCCC',
    paddingHorizontal: 8,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  rowLabelText: { fontSize: 11, fontWeight: '600', color: '#444' },
  rowValue: { flex: 1, paddingHorizontal: 8, paddingVertical: 7, justifyContent: 'center' },
  rowValueText: { fontSize: 11, color: '#222' },
  wageText: { fontSize: 12, fontWeight: '700', color: '#0669F7' },
  // Terms
  termsBox: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 3,
    padding: 12,
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  termsTitle: { fontSize: 10, fontWeight: '700', color: '#1a4fa0', marginBottom: 6 },
  termRow: { flexDirection: 'row', marginBottom: 3 },
  termNum: { fontSize: 10, color: '#555', lineHeight: 16, marginRight: 4, minWidth: 14 },
  termText: { flex: 1, fontSize: 10, color: '#555', lineHeight: 16 },
  // Signatures
  sigBox: { borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 3, padding: 12, marginBottom: 12 },
  sigTitle: { fontSize: 10, fontWeight: '700', color: '#1a4fa0', marginBottom: 10 },
  sigRow: { flexDirection: 'row', gap: 10 },
  sigParty: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 3,
    backgroundColor: '#FAFAFA',
    padding: 10,
  },
  sigPartyLabel: { fontSize: 10, fontWeight: '700', color: '#444', marginBottom: 3 },
  sigPartyName: { fontSize: 10, color: '#666', marginBottom: 6 },
  sigImageBox: {
    borderTopWidth: 1,
    borderTopColor: '#CCCCCC',
    paddingTop: 8,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sigImage: { width: '100%', height: 50 },
  sigDoneText: { fontSize: 11, fontWeight: '700', color: '#1a4fa0' },
  sigPendingText: { fontSize: 10, color: '#BBB', fontStyle: 'italic' },
  sigDateText: { fontSize: 9, color: '#888', textAlign: 'center', marginTop: 4 },
  // Footer
  footer: {
    fontSize: 9,
    color: '#AAA',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 10,
  },
});
