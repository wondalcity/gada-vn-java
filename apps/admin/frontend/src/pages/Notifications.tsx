import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAdminTranslation } from '../context/LanguageContext'
import { GadaSelect } from '../components/ui/GadaFormControls'

interface Schedule {
  id: string
  title: string
  body: string
  status: string
  scheduled_at: string
  target_role?: string
  target_user_ids?: string[]
}

interface User {
  user_id: string
  name: string
  phone?: string
  role: string
}

type Channel = 'push' | 'sms'
type TargetType = 'role' | 'users'
type SendType = 'now' | 'schedule'

const STATUS_BADGE: Record<string, string> = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  SENT:      'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
  FAILED:    'bg-red-50 text-red-600',
}

export default function Notifications() {
  const { t, locale } = useAdminTranslation()
  const [schedules, setSchedules]         = useState<Schedule[]>([])
  const [flash, setFlash]                 = useState<{ type: 'success'|'scheduled'|'cancelled'|'error'; msg?: string } | null>(null)
  const [targetType, setTargetType]       = useState<TargetType>('role')
  const [sendType, setSendType]           = useState<SendType>('now')
  const [targetRole, setTargetRole]       = useState('WORKER')
  const [channels, setChannels]           = useState<Channel[]>(['push'])
  const [form, setForm]                   = useState({ title: '', body: '', scheduledAt: '' })
  const [userSearch, setUserSearch]       = useState('')
  const [userResults, setUserResults]     = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [sending, setSending]             = useState(false)
  const [sendResult, setSendResult]       = useState<{ push: number; sms: number } | null>(null)

  const CHANNEL_CONFIG: Record<Channel, { label: string; icon: string; desc: string }> = {
    push: { label: t('notifications.push_label'), icon: '🔔', desc: 'FCM' },
    sms:  { label: t('notifications.sms_label'),  icon: '💬', desc: t('notifications.sms_label') },
  }

  const STATUS_LABEL: Record<string, string> = {
    PENDING:   t('notifications.status_pending'),
    SENT:      t('notifications.status_sent'),
    CANCELLED: t('notifications.status_cancelled'),
    FAILED:    t('notifications.status_failed'),
  }

  // Load schedules
  useEffect(() => {
    api.get<Schedule[]>('/admin/notifications/schedules')
      .then(d => setSchedules(Array.isArray(d) ? d : []))
      .catch(() => setSchedules([]))
  }, [flash])

  // User search debounce
  useEffect(() => {
    if (userSearch.length < 1) { setUserResults([]); return }
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ search: userSearch, role: targetRole })
      api.get<User[]>(`/admin/notification-users?${params}`)
        .then(d => setUserResults(Array.isArray(d) ? d : []))
        .catch(() => setUserResults([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [userSearch, targetRole])

  function toggleChannel(ch: Channel) {
    setChannels(prev =>
      prev.includes(ch) ? prev.filter(c => c !== ch) : [...prev, ch]
    )
  }

  function toggleUser(u: User) {
    setSelectedUsers(prev =>
      prev.find(s => s.user_id === u.user_id)
        ? prev.filter(s => s.user_id !== u.user_id)
        : [...prev, u]
    )
  }

  async function getTargetUserIds(): Promise<string[]> {
    if (targetType === 'users') return selectedUsers.map(u => u.user_id)
    // role → fetch all users with that role
    const users = await api.get<User[]>(`/admin/notification-users?role=${targetRole}`)
    return (Array.isArray(users) ? users : []).map(u => u.user_id)
  }

  function showFlash(type: 'success' | 'scheduled' | 'cancelled' | 'error' | null, msg?: string) {
    setFlash(type ? { type, msg } : null)
    setTimeout(() => setFlash(null), 4000)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.body) return
    if (channels.length === 0) { alert(t('notifications.alert_no_channel')); return }
    setSending(true)
    setSendResult(null)
    try {
      if (sendType === 'now') {
        const userIds = await getTargetUserIds()
        if (userIds.length === 0) { alert(t('notifications.alert_no_users')); setSending(false); return }
        const result = await api.post<{ push: number; sms: number }>('/admin/notifications/send', {
          userIds, title: form.title, body: form.body, channels, type: 'ADMIN',
        })
        setSendResult(result)
        showFlash('success')
      } else {
        await api.post('/admin/notifications/schedule', {
          title: form.title, body: form.body,
          targetUserIds: targetType === 'users' ? selectedUsers.map(u => u.user_id) : [],
          targetRole: targetType === 'role' ? targetRole : undefined,
          scheduledAt: form.scheduledAt,
        })
        showFlash('scheduled')
      }
      setForm({ title: '', body: '', scheduledAt: '' })
      setSelectedUsers([])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('notifications.flash_error')
      showFlash('error', msg)
    } finally {
      setSending(false)
    }
  }

  async function cancelSchedule(id: string) {
    if (!confirm(t('notifications.confirm_cancel_schedule'))) return
    try {
      await api.delete(`/admin/notifications/schedules/${id}`)
      setSchedules(prev => prev.map(s => s.id === id ? { ...s, status: 'CANCELLED' } : s))
      showFlash('cancelled')
    } catch { showFlash('error') }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('notifications.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('notifications.subtitle')}</p>
      </div>

      {/* Flash messages */}
      {flash?.type === 'success' && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 text-green-700 rounded-2xl p-4 mb-5 text-sm">
          <span className="text-lg">✅</span>
          <div>
            <p className="font-semibold">{t('notifications.flash_sent')}</p>
            {sendResult && (
              <p className="text-xs mt-1 text-green-600">
                {sendResult.push > 0 && `Push ${sendResult.push}`}
                {sendResult.push > 0 && sendResult.sms > 0 && ' · '}
                {sendResult.sms > 0 && `SMS ${sendResult.sms}`}
              </p>
            )}
          </div>
        </div>
      )}
      {flash?.type === 'scheduled' && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl p-4 mb-5 text-sm">
          <span className="text-lg">📅</span> {t('notifications.flash_scheduled')}
        </div>
      )}
      {flash?.type === 'cancelled' && (
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 text-gray-600 rounded-2xl p-4 mb-5 text-sm">
          <span className="text-lg">🗑️</span> {t('notifications.flash_cancelled')}
        </div>
      )}
      {flash?.type === 'error' && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 mb-5 text-sm">
          <span className="text-lg">❌</span> {t('notifications.flash_error')} {flash.msg && <span className="opacity-70">{flash.msg}</span>}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── Send Form ── (col-span-3) */}
        <div className="xl:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
              {t('notifications.form_title')}
            </h2>
            <form onSubmit={handleSend} className="space-y-5">

              {/* Title */}
              <FN label={t('notifications.field_title')}>
                <input required maxLength={100} className={IN}
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder={t('notifications.field_title_placeholder')} />
              </FN>

              {/* Body */}
              <FN label={t('notifications.field_body')}>
                <textarea required rows={3} maxLength={300} className={IN + ' resize-none'}
                  value={form.body}
                  onChange={e => setForm({ ...form, body: e.target.value })}
                  placeholder={t('notifications.field_body_placeholder')} />
                <p className="text-xs text-gray-400 text-right mt-0.5">{form.body.length}/300</p>
              </FN>

              {/* Channel selection */}
              <FN label={t('notifications.field_channel')}>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(CHANNEL_CONFIG) as Channel[]).map(ch => {
                    const cfg = CHANNEL_CONFIG[ch]
                    const active = channels.includes(ch)
                    return (
                      <button key={ch} type="button" onClick={() => toggleChannel(ch)}
                        className={`relative flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                          active
                            ? 'border-[#0669F7] bg-[#EEF4FF]'
                            : 'border-[#EFF1F5] bg-white hover:border-gray-300'
                        }`}>
                        <span className="text-2xl">{cfg.icon}</span>
                        <div>
                          <p className={`text-sm font-semibold ${active ? 'text-[#0669F7]' : 'text-gray-700'}`}>{cfg.label}</p>
                          <p className="text-xs text-gray-400">{cfg.desc}</p>
                        </div>
                        {active && (
                          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#0669F7] flex items-center justify-center text-white text-xs">✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {channels.includes('sms') && (
                  <p className="text-xs text-amber-600 mt-2 bg-amber-50 rounded-lg px-3 py-1.5">
                    {t('notifications.sms_warning')}
                  </p>
                )}
              </FN>

              {/* Target type */}
              <FN label={t('notifications.field_target')}>
                <div className="flex gap-2">
                  {([['role', t('notifications.target_role')], ['users', t('notifications.target_users')]] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => { setTargetType(val); setSelectedUsers([]) }}
                      className={`flex-1 py-2.5 rounded-2xl text-sm font-medium border-2 transition-colors ${
                        targetType === val ? 'bg-[#0669F7] text-white border-[#0669F7]' : 'bg-white text-gray-600 border-[#EFF1F5]'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </FN>

              {/* Target: role selector */}
              {targetType === 'role' && (
                <FN label={t('notifications.field_target_role')}>
                  <GadaSelect value={targetRole} onChange={e => setTargetRole(e.target.value)}>
                    <option value="WORKER">{t('notifications.role_worker_all')}</option>
                    <option value="MANAGER">{t('notifications.role_manager_all')}</option>
                  </GadaSelect>
                </FN>
              )}

              {/* Target: individual user search */}
              {targetType === 'users' && (
                <FN label={t('notifications.field_user_search')}>
                  <div className="flex gap-2 mb-2">
                    <GadaSelect value={targetRole} onChange={e => setTargetRole(e.target.value)}>
                      <option value="WORKER">{t('notifications.role_worker')}</option>
                      <option value="MANAGER">{t('notifications.role_manager')}</option>
                      <option value="">{t('notifications.role_all')}</option>
                    </GadaSelect>
                    <input type="text" className="flex-1 border border-[#EFF1F5] rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0669F7]"
                      value={userSearch} onChange={e => setUserSearch(e.target.value)}
                      placeholder={t('notifications.user_search_placeholder')} />
                  </div>

                  {/* Search results */}
                  {userResults.length > 0 && (
                    <div className="border border-[#EFF1F5] rounded-2xl max-h-48 overflow-y-auto mb-2 bg-white shadow-sm">
                      {userResults.map(u => {
                        const sel = selectedUsers.some(s => s.user_id === u.user_id)
                        return (
                          <button key={u.user_id} type="button" onClick={() => toggleUser(u)}
                            className={`w-full text-left px-4 py-2.5 flex items-center justify-between text-sm border-b border-[#EFF1F5] last:border-0 transition-colors ${sel ? 'bg-[#EEF4FF]' : 'hover:bg-[#F8F9FA]'}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                                u.role === 'WORKER' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                              }`}>
                                {(u.name ?? '?')[0]?.toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <span className="font-medium truncate block">{u.name}</span>
                                <span className="text-xs text-gray-400 truncate block">{u.phone ?? u.role}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                u.role === 'WORKER' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                              }`}>{u.role === 'WORKER' ? t('notifications.role_worker') : t('notifications.role_manager')}</span>
                              {sel && <span className="text-[#0669F7] font-bold">✓</span>}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Selected users chips */}
                  {selectedUsers.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">{t('notifications.selected_users').replace('{n}', String(selectedUsers.length))}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedUsers.map(u => (
                          <span key={u.user_id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#E6F0FE] text-[#0550C4] rounded-full text-xs font-medium">
                            {u.name}
                            <button type="button" onClick={() => toggleUser(u)} className="text-[#0669F7] hover:text-red-500 font-bold ml-0.5">×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </FN>
              )}

              {/* Send type */}
              <FN label={t('notifications.field_send_time')}>
                <div className="flex gap-2">
                  {([['now', t('notifications.send_now'), '🚀'], ['schedule', t('notifications.send_schedule'), '📅']] as const).map(([val, label, icon]) => (
                    <button key={val} type="button" onClick={() => setSendType(val)}
                      className={`flex-1 py-2.5 rounded-2xl text-sm font-medium border-2 flex items-center justify-center gap-1.5 transition-colors ${
                        sendType === val ? 'bg-[#0669F7] text-white border-[#0669F7]' : 'bg-white text-gray-600 border-[#EFF1F5]'
                      }`}>
                      <span>{icon}</span> {label}
                    </button>
                  ))}
                </div>
              </FN>

              {sendType === 'schedule' && (
                <FN label={t('notifications.field_schedule_at')}>
                  <input type="datetime-local" required lang={locale} className={IN}
                    value={form.scheduledAt}
                    onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                </FN>
              )}

              {/* Submit */}
              <button type="submit" disabled={sending || channels.length === 0}
                className="w-full bg-[#0669F7] hover:bg-[#0550C4] text-white font-semibold py-3 rounded-2xl transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                {sending ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> {t('notifications.submitting')}</>
                ) : sendType === 'now' ? (
                  <>{t('notifications.submit_now')}</>
                ) : (
                  <>{t('notifications.submit_schedule')}</>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right panel ── (col-span-2) */}
        <div className="xl:col-span-2 space-y-5">

          {/* Channel guide */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('notifications.channel_guide')}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-[#EEF4FF] rounded-xl">
                <span className="text-xl">🔔</span>
                <div>
                  <p className="font-medium text-[#0669F7]">{t('notifications.push_label')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('notifications.push_desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl">
                <span className="text-xl">💬</span>
                <div>
                  <p className="font-medium text-green-700">{t('notifications.sms_label')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t('notifications.sms_desc')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Scheduled notifications */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#EFF1F5]">
              <h3 className="text-sm font-semibold text-gray-700">{t('notifications.scheduled_title')}</h3>
            </div>
            {schedules.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm">{t('notifications.no_scheduled')}</p>
              </div>
            ) : (
              <div className="divide-y divide-[#EFF1F5] max-h-80 overflow-y-auto">
                {schedules.map(s => (
                  <div key={s.id} className="p-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 truncate">{s.title}</span>
                        <span className={`shrink-0 px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[s.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {STATUS_LABEL[s.status] ?? s.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate mb-1">{s.body}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.scheduled_at).toLocaleString('ko-KR')}
                        {s.target_role && ` · ${s.target_role === 'WORKER' ? t('notifications.target_worker_suffix') : t('notifications.target_manager_suffix')}`}
                        {s.target_user_ids && s.target_user_ids.length > 0 && ` · ${s.target_user_ids.length}`}
                      </p>
                    </div>
                    {s.status === 'PENDING' && (
                      <button onClick={() => cancelSchedule(s.id)}
                        className="shrink-0 text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-colors">
                        {t('notifications.cancel_schedule')}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const IN = 'w-full border border-outline rounded-sm px-3 py-2.5 text-sm text-on-surface bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary'

function FN({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}
