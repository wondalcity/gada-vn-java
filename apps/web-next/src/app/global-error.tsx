'use client'

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="ko">
      <body>
        <div style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#e5e7eb',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <p style={{ fontSize: '14px', color: '#98A2B2', marginBottom: '16px' }}>
            페이지를 불러올 수 없습니다
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={reset}
              style={{ padding: '10px 20px', borderRadius: '16px', border: '1px solid #EFF1F5', fontSize: '14px', background: '#fff', cursor: 'pointer' }}
            >
              다시 시도
            </button>
            <a
              href="/ko"
              style={{ padding: '10px 20px', borderRadius: '16px', background: '#0669F7', color: '#fff', fontSize: '14px', textDecoration: 'none' }}
            >
              메인으로
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
