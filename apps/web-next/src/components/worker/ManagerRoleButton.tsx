'use client'

import * as React from 'react'
import { getSessionCookie } from '../../lib/auth/session'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1'

interface Props {
  locale: string
  initialManagerStatus?: 'active' | 'pending' | null
}

export function ManagerRoleButton({ initialManagerStatus }: Props) {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'pending' | 'active'>(
    initialManagerStatus === 'pending' ? 'pending'
    : initialManagerStatus === 'active' ? 'active'
    : 'idle',
  )

  async function handleRequest() {
    const token = getSessionCookie()
    if (!token) return

    setStatus('loading')
    try {
      const res = await fetch(`${API_BASE}/auth/request-manager`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      if (res.ok) {
        const body = await res.json()
        if (body?.data?.alreadyManager) setStatus('active')
        else setStatus('pending') // { pending: true }
      } else {
        setStatus('idle')
      }
    } catch {
      setStatus('idle')
    }
  }

  if (status === 'active') {
    return (
      <span className="px-4 py-2 rounded-full bg-orange-100 text-orange-700 text-sm font-medium">
        관리자 활성화됨
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span className="px-4 py-2 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 text-sm font-medium">
        심사 중
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={handleRequest}
      disabled={status === 'loading'}
      className="px-4 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
    >
      {status === 'loading' ? '신청 중...' : '관리자 신청'}
    </button>
  )
}
