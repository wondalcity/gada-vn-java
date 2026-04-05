import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAdminTranslation } from '../context/LanguageContext'

interface TestAccount {
  id: string
  phone: string
  role: string
  status: string
  full_name: string | null
  created_at: string
}

const IN = 'w-full border border-[#EFF1F5] rounded-2xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]'
const LABEL = 'block text-xs font-medium text-gray-500 mb-1'

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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">{t('test_accounts.add_modal.title')}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={LABEL}>{t('test_accounts.add_modal.phone')} *</label>
            <input className={IN} value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+84901234567" />
          </div>
          <div>
            <label className={LABEL}>{t('test_accounts.add_modal.name')}</label>
            <input className={IN} value={name} onChange={e => setName(e.target.value)}
              placeholder={t('test_accounts.add_modal.name_placeholder')} />
          </div>
          <div>
            <label className={LABEL}>{t('test_accounts.add_modal.role')}</label>
            <select className={IN} value={role} onChange={e => setRole(e.target.value)}>
              <option value="WORKER">{t('test_accounts.role_worker')}</option>
              <option value="MANAGER">{t('test_accounts.role_manager')}</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onCancel}
              className="flex-1 h-10 border border-[#EFF1F5] rounded-xl text-sm">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 h-10 bg-[#0669F7] text-white rounded-xl text-sm font-medium disabled:opacity-40">
              {saving ? t('common.saving') : t('test_accounts.add_modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function TestAccounts() {
  const { t } = useAdminTranslation()
  const [accounts, setAccounts] = useState<TestAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [flash, setFlash] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await api.get<TestAccount[]>('/admin/test-accounts')
      setAccounts(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(id: string) {
    if (!confirm(t('test_accounts.confirm_delete'))) return
    try {
      await api.delete(`/admin/test-accounts/${id}`)
      setFlash(t('test_accounts.deleted'))
      setTimeout(() => setFlash(''), 3000)
      load()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : t('common.delete_failed'))
    }
  }

  async function handleSave() {
    setShowAdd(false)
    setFlash(t('test_accounts.created'))
    setTimeout(() => setFlash(''), 3000)
    await load()
  }

  return (
    <div className="space-y-6">
      {showAdd && <AddModal onSave={handleSave} onCancel={() => setShowAdd(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{t('test_accounts.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('test_accounts.subtitle')}</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="h-10 px-4 bg-[#0669F7] text-white rounded-xl text-sm font-medium">
          {t('test_accounts.add')}
        </button>
      </div>

      {flash && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-xl">
          {flash}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#EFF1F5] overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800">{t('test_accounts.otp_hint')}</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('common.loading')}</div>
        ) : accounts.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">{t('test_accounts.empty')}</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t('test_accounts.col_phone')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t('test_accounts.col_name')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t('test_accounts.col_role')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t('test_accounts.col_status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">{t('test_accounts.col_created')}</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFF1F5]">
              {accounts.map(acc => (
                <tr key={acc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono">{acc.phone}</td>
                  <td className="px-4 py-3 text-gray-700">{acc.full_name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      acc.role === 'MANAGER'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {acc.role === 'MANAGER' ? t('test_accounts.role_manager') : t('test_accounts.role_worker')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{acc.status}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(acc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(acc.id)}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50">
                      {t('common.delete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
