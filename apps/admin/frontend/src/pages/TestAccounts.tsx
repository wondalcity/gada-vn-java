import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAdminTranslation } from '../context/LanguageContext'
import { fmtDate } from '../lib/dateUtils'
import { GadaSelect } from '../components/ui/GadaFormControls'

interface TestAccount {
  id: string
  phone: string
  role: string
  status: string
  full_name: string | null
  created_at: string
}

const IN = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'

function AddModal({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  const { t } = useAdminTranslation()
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('WORKER')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!phone.trim()) { setError(t('test_accounts.error_phone_required')); return }
    setSaving(true); setError('')
    try {
      await api.post('/admin/test-accounts', { phone: phone.trim(), role, name: name.trim() })
      onSave()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('test_accounts.error_create_failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">{t('test_accounts.add_modal.title')}</h3>
        {error && (
          <div className="bg-[#FDE8EE] border border-[#F4B0C0] text-[#D81A48] rounded-xl p-3 mb-3 text-sm">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('test_accounts.add_modal.phone')} *</label>
            <input className={IN} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+84901234567" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('test_accounts.add_modal.name')}</label>
            <input className={IN} value={name} onChange={e => setName(e.target.value)}
              placeholder={t('test_accounts.add_modal.name_placeholder')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t('test_accounts.add_modal.role')}</label>
            <GadaSelect value={role} onChange={e => setRole(e.target.value)}>
              <option value="WORKER">{t('test_accounts.role_worker')}</option>
              <option value="MANAGER">{t('test_accounts.role_manager')}</option>
            </GadaSelect>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-[#EFF1F5] text-gray-600 hover:bg-[#F2F4F5]">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#0669F7] text-white hover:bg-[#0550C4] disabled:opacity-50">
              {saving ? t('common.saving') : t('test_accounts.add_modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TestAccounts() {
  const { t, locale } = useAdminTranslation()
  const [accounts, setAccounts] = useState<TestAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showMsg(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  function load() {
    setLoading(true)
    api.get<TestAccount[]>('/admin/test-accounts')
      .then(setAccounts)
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleDelete(acc: TestAccount) {
    if (!confirm(t('test_accounts.confirm_delete'))) return
    try {
      await api.delete(`/admin/test-accounts/${acc.id}`)
      showMsg(t('test_accounts.deleted'))
      load()
    } catch (err: unknown) {
      showMsg(err instanceof Error ? err.message : t('common.delete_failed'))
    }
  }

  return (
    <div className="p-8">
      {showAdd && (
        <AddModal
          onSave={() => { setShowAdd(false); showMsg(t('test_accounts.created')); load() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-lg bg-[#25282A] text-white whitespace-nowrap">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('test_accounts.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('test_accounts.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0669F7] hover:bg-[#0550C4] text-white text-sm font-medium rounded-2xl transition-colors"
        >
          {t('test_accounts.add')}
        </button>
      </div>

      <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
        <span>{t('test_accounts.otp_hint')}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : accounts.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🧪</p>
            <p className="text-sm">{t('test_accounts.empty')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-[#F2F4F5]">
                <tr>
                  {[
                    t('test_accounts.col_phone'),
                    t('test_accounts.col_name'),
                    t('test_accounts.col_role'),
                    t('test_accounts.col_status'),
                    t('test_accounts.col_created'),
                    '',
                  ].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFF1F5]">
                {accounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-[#F8F9FA]">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900 whitespace-nowrap">{acc.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{acc.full_name ?? '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                        acc.role === 'MANAGER'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {acc.role === 'MANAGER' ? t('test_accounts.role_manager') : t('test_accounts.role_worker')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400 whitespace-nowrap">
                      {fmtDate(acc.created_at, locale)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(acc)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        {t('common.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
