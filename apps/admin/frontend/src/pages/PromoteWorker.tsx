import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

interface Worker {
  id: string
  full_name: string
  phone?: string
  id_verified: boolean
  user_id?: string
  current_province?: string
  created_at: string
}

interface WorkerDetail extends Worker {
  user_id: string
}

export default function PromoteWorker() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Worker[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkerDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [businessType, setBusinessType] = useState('INDIVIDUAL')
  const [representativeName, setRepresentativeName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [representativeDob, setRepresentativeDob] = useState('')
  const [representativeGender, setRepresentativeGender] = useState('')
  const [businessRegNumber, setBusinessRegNumber] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactAddress, setContactAddress] = useState('')
  const [province, setProvince] = useState('')
  const [firstSiteName, setFirstSiteName] = useState('')
  const [firstSiteAddress, setFirstSiteAddress] = useState('')

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    setSearching(true)
    setError('')
    try {
      const res = await api.get<{ data: Worker[]; total: number }>(
        `/admin/workers?search=${encodeURIComponent(searchQuery)}&limit=20`
      )
      setSearchResults(res.data ?? [])
    } catch (err: any) {
      setError(err.message ?? '검색 실패')
    } finally {
      setSearching(false)
    }
  }, [searchQuery])

  const handleSelectWorker = useCallback(async (worker: Worker) => {
    setLoadingDetail(true)
    setError('')
    setSelectedWorker(null)
    try {
      const detail = await api.get<WorkerDetail>(`/admin/workers/${worker.id}`)
      if (!detail.user_id) {
        setError('이 근로자의 user_id를 찾을 수 없습니다.')
        return
      }
      setSelectedWorker({ ...detail, id: worker.id })
      // Pre-fill phone from worker
      if (detail.phone && !contactPhone) {
        setContactPhone(detail.phone)
      }
    } catch (err: any) {
      setError(err.message ?? '근로자 정보를 불러오지 못했습니다.')
    } finally {
      setLoadingDetail(false)
    }
  }, [contactPhone])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWorker) return
    if (!representativeName.trim()) {
      setError('담당자명은 필수입니다.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      await api.post('/admin/managers/promote-worker', {
        userId: selectedWorker.user_id,
        businessType,
        representativeName: representativeName.trim(),
        companyName: companyName.trim() || undefined,
        representativeDob: representativeDob || undefined,
        representativeGender: representativeGender || undefined,
        businessRegNumber: businessRegNumber.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactAddress: contactAddress.trim() || undefined,
        province: province.trim() || undefined,
        firstSiteName: firstSiteName.trim() || undefined,
        firstSiteAddress: firstSiteAddress.trim() || undefined,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message ?? '지정에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }, [
    selectedWorker, businessType, representativeName, companyName,
    representativeDob, representativeGender, businessRegNumber,
    contactPhone, contactAddress, province, firstSiteName, firstSiteAddress,
  ])

  if (success) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-green-800 mb-2">관리자 지정 완료</h2>
            <p className="text-green-700 text-sm mb-6">
              {selectedWorker?.full_name} 님이 관리자로 지정되었습니다.
            </p>
            <Link
              to="/managers?status=APPROVED"
              className="inline-block bg-[#0669F7] text-white px-6 py-2.5 rounded-2xl text-sm font-medium hover:bg-[#0550C4] transition-colors"
            >
              관리자 목록 보기
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">관리자 직접 지정</h1>
      <p className="text-sm text-gray-500 mb-6">근로자를 검색하여 관리자로 즉시 지정합니다.</p>

      {error && (
        <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-2xl p-4 mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Warning notice */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-6 text-sm text-yellow-800">
        <span className="font-semibold">⚠️ 직접 지정은 실제 검증이 완료된 경우에만 사용하세요.</span>
        <br />
        지정 즉시 해당 근로자는 관리자 권한이 활성화됩니다.
      </div>

      {/* Section 1: Worker Search */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6 max-w-2xl">
        <h2 className="text-base font-semibold text-gray-800 mb-4">1. 근로자 검색</h2>
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름 또는 전화번호 검색"
            className="flex-1 border border-[#EFF1F5] rounded-2xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-[#0669F7] text-white px-4 py-2 rounded-2xl text-sm font-medium disabled:opacity-50"
          >
            {searching ? '검색 중...' : '검색'}
          </button>
        </form>

        {loadingDetail && (
          <div className="text-center text-gray-400 text-sm py-4">근로자 정보 불러오는 중...</div>
        )}

        {searchResults.length > 0 && !selectedWorker && !loadingDetail && (
          <div className="divide-y divide-[#EFF1F5] border border-[#EFF1F5] rounded-2xl overflow-hidden">
            {searchResults.map((w) => (
              <button
                key={w.id}
                onClick={() => handleSelectWorker(w)}
                className="w-full text-left px-4 py-3 hover:bg-[#EEF4FF] transition-colors flex items-center justify-between"
              >
                <div>
                  <span className="text-sm font-medium text-gray-900">{w.full_name}</span>
                  <span className="ml-3 text-xs text-gray-500">{w.phone ?? '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {w.id_verified ? (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">신분증 인증</span>
                  ) : (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-[#EFF1F5] text-[#98A2B2]00">미인증</span>
                  )}
                  <span className="text-[#0669F7] text-xs">선택 →</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {selectedWorker && (
          <div className="bg-[#EEF4FF] border border-[#B8D4FD] rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">{selectedWorker.full_name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{selectedWorker.phone ?? '-'} · user_id: {selectedWorker.user_id}</p>
            </div>
            <button
              onClick={() => { setSelectedWorker(null); setSearchResults([]) }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              다시 선택
            </button>
          </div>
        )}
      </div>

      {/* Section 2: Manager Profile Form */}
      {selectedWorker && (
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">2. 관리자 정보 입력</h2>

            <div className="space-y-4">
              {/* Business Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사업자 유형 <span className="text-[#D81A48]">*</span>
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                  required
                >
                  <option value="INDIVIDUAL">개인</option>
                  <option value="CORPORATE">법인</option>
                </select>
              </div>

              {/* Representative Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자명 <span className="text-[#D81A48]">*</span>
                </label>
                <input
                  type="text"
                  value={representativeName}
                  onChange={(e) => setRepresentativeName(e.target.value)}
                  className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                  required
                />
              </div>

              {/* Company Name — only for CORPORATE */}
              {businessType === 'CORPORATE' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">회사명</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                  />
                </div>
              )}

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                <input
                  type="date"
                  value={representativeDob}
                  onChange={(e) => setRepresentativeDob(e.target.value)}
                  className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">성별</label>
                <select
                  value={representativeGender}
                  onChange={(e) => setRepresentativeGender(e.target.value)}
                  className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                >
                  <option value="">선택 안 함</option>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                  <option value="OTHER">기타</option>
                </select>
              </div>

              {/* Business Reg Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사업자등록번호</label>
                <input
                  type="text"
                  value={businessRegNumber}
                  onChange={(e) => setBusinessRegNumber(e.target.value)}
                  className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                />
              </div>

              {/* Contact Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">연락처</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                />
              </div>

              {/* Contact Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">사업장 주소</label>
                <input
                  type="text"
                  value={contactAddress}
                  onChange={(e) => setContactAddress(e.target.value)}
                  className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                />
              </div>

              {/* Province */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">지역</label>
                <input
                  type="text"
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                />
              </div>

              {/* First Site Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">첫 번째 현장명</label>
                <input
                  type="text"
                  value={firstSiteName}
                  onChange={(e) => setFirstSiteName(e.target.value)}
                  className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                />
              </div>

              {/* First Site Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">현장 주소</label>
                <input
                  type="text"
                  value={firstSiteAddress}
                  onChange={(e) => setFirstSiteAddress(e.target.value)}
                  className="w-full border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#0669F7] text-white py-3 rounded-2xl text-sm font-semibold hover:bg-[#0550C4] transition-colors disabled:opacity-50"
          >
            {submitting ? '처리 중...' : '관리자로 지정하기'}
          </button>
        </form>
      )}
    </div>
  )
}
