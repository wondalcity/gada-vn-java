import { createContext, useContext, useState, useCallback } from 'react'

export type AdminLocale = 'ko' | 'vi' | 'en'

const STORAGE_KEY = 'gada_admin_locale'

function getInitialLocale(): AdminLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'ko' || stored === 'vi' || stored === 'en') return stored
  } catch {}
  return 'ko'
}

interface LanguageContextValue {
  locale: AdminLocale
  setLocale: (locale: AdminLocale) => void
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: 'ko',
  setLocale: () => {},
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AdminLocale>(getInitialLocale)

  const setLocale = useCallback((next: AdminLocale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }, [])

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}

// Simple flat translation map
export const ADMIN_TRANSLATIONS: Record<AdminLocale, Record<string, string>> = {
  ko: {
    'settings.title': '설정',
    'settings.language.title': '언어 설정',
    'settings.language.subtitle': '어드민 패널에 표시될 언어를 선택하세요',
    'settings.language.ko': '한국어',
    'settings.language.vi': 'Tiếng Việt',
    'settings.language.en': 'English',
    'settings.language.current_suffix': '(현재)',

    'nav.dashboard': '📊 대시보드',
    'nav.managers': '👔 관리자 승인',
    'nav.managers_promote': '➕ 관리자 직접 지정',
    'nav.workers': '👷 근로자 관리',
    'nav.jobs': '🏗️ 일자리 관리',
    'nav.sites': '🏗️ 현장 관리',
    'nav.companies': '🏢 건설사 관리',
    'nav.notifications': '🔔 알림 발송',
    'nav.admin_users': '🔑 어드민 계정',
    'nav.settings': '⚙️ 설정',

    'layout.change_password': '🔒 비밀번호 변경',
    'layout.logout': '로그아웃',
    'layout.role.super_admin': '슈퍼관리자',
    'layout.role.admin': '관리자',
    'layout.role.viewer': '뷰어',

    'layout.pw_modal.title': '비밀번호 변경',
    'layout.pw_modal.current': '현재 비밀번호',
    'layout.pw_modal.new': '새 비밀번호 (8자 이상)',
    'layout.pw_modal.confirm': '새 비밀번호 확인',
    'layout.pw_modal.cancel': '취소',
    'layout.pw_modal.submit': '변경',
    'layout.pw_modal.submitting': '변경 중...',
    'layout.pw_modal.success': '비밀번호가 변경되었습니다',
    'layout.pw_modal.ok': '확인',
    'layout.pw_modal.error_mismatch': '새 비밀번호가 일치하지 않습니다',
    'layout.pw_modal.error_min_length': '비밀번호는 8자 이상이어야 합니다',
    'layout.pw_modal.error_failed': '변경 실패',
  },
  vi: {
    'settings.title': 'Cài đặt',
    'settings.language.title': 'Cài đặt ngôn ngữ',
    'settings.language.subtitle': 'Chọn ngôn ngữ hiển thị của bảng quản trị',
    'settings.language.ko': '한국어',
    'settings.language.vi': 'Tiếng Việt',
    'settings.language.en': 'English',
    'settings.language.current_suffix': '(Hiện tại)',

    'nav.dashboard': '📊 Bảng điều khiển',
    'nav.managers': '👔 Duyệt quản lý',
    'nav.managers_promote': '➕ Chỉ định quản lý',
    'nav.workers': '👷 Quản lý công nhân',
    'nav.jobs': '🏗️ Quản lý việc làm',
    'nav.sites': '🏗️ Quản lý công trường',
    'nav.companies': '🏢 Quản lý công ty',
    'nav.notifications': '🔔 Gửi thông báo',
    'nav.admin_users': '🔑 Tài khoản admin',
    'nav.settings': '⚙️ Cài đặt',

    'layout.change_password': '🔒 Đổi mật khẩu',
    'layout.logout': 'Đăng xuất',
    'layout.role.super_admin': 'Siêu quản trị',
    'layout.role.admin': 'Quản trị',
    'layout.role.viewer': 'Xem',

    'layout.pw_modal.title': 'Đổi mật khẩu',
    'layout.pw_modal.current': 'Mật khẩu hiện tại',
    'layout.pw_modal.new': 'Mật khẩu mới (tối thiểu 8 ký tự)',
    'layout.pw_modal.confirm': 'Xác nhận mật khẩu mới',
    'layout.pw_modal.cancel': 'Hủy',
    'layout.pw_modal.submit': 'Đổi',
    'layout.pw_modal.submitting': 'Đang đổi...',
    'layout.pw_modal.success': 'Mật khẩu đã được thay đổi',
    'layout.pw_modal.ok': 'OK',
    'layout.pw_modal.error_mismatch': 'Mật khẩu mới không khớp',
    'layout.pw_modal.error_min_length': 'Mật khẩu phải có ít nhất 8 ký tự',
    'layout.pw_modal.error_failed': 'Đổi mật khẩu thất bại',
  },
  en: {
    'settings.title': 'Settings',
    'settings.language.title': 'Language Settings',
    'settings.language.subtitle': 'Select the display language for the admin panel',
    'settings.language.ko': '한국어',
    'settings.language.vi': 'Tiếng Việt',
    'settings.language.en': 'English',
    'settings.language.current_suffix': '(Current)',

    'nav.dashboard': '📊 Dashboard',
    'nav.managers': '👔 Manager Approval',
    'nav.managers_promote': '➕ Assign Manager',
    'nav.workers': '👷 Worker Management',
    'nav.jobs': '🏗️ Job Management',
    'nav.sites': '🏗️ Site Management',
    'nav.companies': '🏢 Company Management',
    'nav.notifications': '🔔 Send Notifications',
    'nav.admin_users': '🔑 Admin Accounts',
    'nav.settings': '⚙️ Settings',

    'layout.change_password': '🔒 Change Password',
    'layout.logout': 'Log Out',
    'layout.role.super_admin': 'Super Admin',
    'layout.role.admin': 'Admin',
    'layout.role.viewer': 'Viewer',

    'layout.pw_modal.title': 'Change Password',
    'layout.pw_modal.current': 'Current Password',
    'layout.pw_modal.new': 'New Password (min. 8 characters)',
    'layout.pw_modal.confirm': 'Confirm New Password',
    'layout.pw_modal.cancel': 'Cancel',
    'layout.pw_modal.submit': 'Change',
    'layout.pw_modal.submitting': 'Changing...',
    'layout.pw_modal.success': 'Password changed successfully',
    'layout.pw_modal.ok': 'OK',
    'layout.pw_modal.error_mismatch': 'New passwords do not match',
    'layout.pw_modal.error_min_length': 'Password must be at least 8 characters',
    'layout.pw_modal.error_failed': 'Failed to change password',
  },
}

export function useAdminTranslation() {
  const { locale } = useLanguage()
  return (key: string) => ADMIN_TRANSLATIONS[locale]?.[key] ?? key
}
