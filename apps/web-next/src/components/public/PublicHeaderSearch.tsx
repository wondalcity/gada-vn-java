'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/hooks/useAuth';
import { createPortal } from 'react-dom';

const API_BASE = '/api/v1';

interface Province {
  code: string;
  nameVi: string;
  nameEn: string;
  slug: string;
}

interface Trade {
  id: number;
  code: string;
  nameKo: string;
  nameVi: string;
}

interface PublicHeaderSearchProps {
  locale: string;
  basePath?: string;
}

// ─── Responsive Select (dropdown on desktop, bottom sheet on mobile) ───────────

interface SelectOption {
  value: string;
  label: string;
  pinned?: boolean;
}

interface SearchSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder: string;
  title: string;
  onTogglePin?: (value: string) => void;
}

function SearchSelect({ value, onChange, options, placeholder, title, onTogglePin }: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';
  const isSearching = search.trim() !== '';
  const filtered = isSearching
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // When not searching, split into pinned and regular
  const pinnedOptions = isSearching ? [] : filtered.filter(o => o.pinned && o.value !== '');
  const regularOptions = isSearching ? filtered : filtered.filter(o => !o.pinned || o.value === '');
  const hasPinned = pinnedOptions.length > 0 && !isSearching;

  const handleOpen = () => {
    const mobile = window.matchMedia('(max-width: 639px)').matches;
    setIsMobile(mobile);
    setOpen(true);
    if (mobile) document.body.style.overflow = 'hidden';
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
    document.body.style.overflow = '';
  };

  const handleSelect = (v: string) => {
    onChange(v);
    handleClose();
  };

  // Close desktop dropdown on outside click
  useEffect(() => {
    if (!open || isMobile) return;
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, isMobile]);

  // Auto-focus desktop search input
  useEffect(() => {
    if (open && !isMobile && options.length > 8) {
      setTimeout(() => desktopSearchRef.current?.focus(), 0);
    }
  }, [open, isMobile, options.length]);

  function renderDesktopOption(o: SelectOption) {
    const isSelected = value === o.value;
    const showPin = onTogglePin && o.value !== '';
    return (
      <li key={o.value || '__all__'}>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); handleSelect(o.value); }}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors group ${
            isSelected ? 'text-[#0669F7] font-semibold bg-[#EEF4FF]' : 'text-[#25282A] hover:bg-[#F5F6F8]'
          }`}
        >
          <span className="flex-1 truncate text-left">{o.label}</span>
          <div className="flex items-center gap-1 shrink-0">
            {isSelected && (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[#0669F7]">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {showPin && (
              <span
                role="button"
                aria-label={o.pinned ? '북마크 해제' : '북마크'}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(o.value); }}
                className={[
                  'w-5 h-5 flex items-center justify-center text-sm leading-none rounded transition-opacity',
                  o.pinned ? 'opacity-100 text-[#0669F7]' : 'opacity-0 group-hover:opacity-50 text-[#98A2B2]',
                ].join(' ')}
              >
                {o.pinned ? '★' : '☆'}
              </span>
            )}
          </div>
        </button>
      </li>
    );
  }

  function renderMobileOption(o: SelectOption) {
    const isSelected = value === o.value;
    const showPin = onTogglePin && o.value !== '';
    return (
      <li key={o.value || '__all__'}>
        <button
          type="button"
          onClick={() => handleSelect(o.value)}
          className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[15px] transition-colors ${
            isSelected ? 'bg-[#EEF4FF] text-[#0669F7] font-semibold' : 'text-[#25282A] hover:bg-[#F5F6F8]'
          }`}
        >
          <span className="flex-1 truncate text-left">{o.label}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {isSelected && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[#0669F7]">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {showPin && (
              <span
                role="button"
                aria-label={o.pinned ? '북마크 해제' : '북마크'}
                onClick={(e) => { e.stopPropagation(); onTogglePin(o.value); }}
                className={[
                  'w-6 h-6 flex items-center justify-center text-base leading-none rounded transition-opacity',
                  o.pinned ? 'opacity-100 text-[#0669F7]' : 'opacity-40 text-[#98A2B2]',
                ].join(' ')}
              >
                {o.pinned ? '★' : '☆'}
              </span>
            )}
          </div>
        </button>
      </li>
    );
  }

  // ── Desktop dropdown ─────────────────────────────────────────────────────────
  const desktopDropdown = open && !isMobile ? (
    <div className="absolute top-full left-0 mt-1 w-full min-w-[220px] bg-white border border-[#E5E7EB] rounded-xl shadow-xl z-50 overflow-hidden">
      {options.length > 8 && (
        <div className="px-2 pt-2 pb-1 border-b border-[#F5F6F8]">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#98A2B2]">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <input
              ref={desktopSearchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="검색..."
              className="w-full pl-7 pr-2 py-1.5 text-xs bg-[#F5F6F8] rounded-lg border-none outline-none text-[#25282A] placeholder:text-[#98A2B2]"
            />
          </div>
        </div>
      )}
      <ul className="overflow-y-auto max-h-56 py-1">
        {isSearching ? (
          <>
            {filtered.length === 0 ? (
              <li className="py-6 text-center text-xs text-[#98A2B2]">결과 없음</li>
            ) : (
              filtered.map(o => renderDesktopOption(o))
            )}
          </>
        ) : (
          <>
            {hasPinned && (
              <>
                <li className="px-3 py-1">
                  <span className="text-[10px] font-medium text-[#0669F7]">★ 즐겨찾는 지역</span>
                </li>
                {pinnedOptions.map(o => renderDesktopOption(o))}
                <li className="h-px bg-[#F0F0F0] mx-2 my-1" />
              </>
            )}
            {regularOptions.map(o => renderDesktopOption(o))}
          </>
        )}
      </ul>
    </div>
  ) : null;

  // ── Mobile bottom sheet (portal) ─────────────────────────────────────────────
  const mobileSheet = open && isMobile && mounted
    ? createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col justify-end" data-search-select-portal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={handleClose} />
          <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[75vh]">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#D0D4DB]" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#EFF1F5] shrink-0">
              <span className="text-[16px] font-bold text-[#25282A]">{title}</span>
              <button type="button" onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#EFF1F5] text-[#98A2B2]"
                aria-label="닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {options.length > 10 && (
              <div className="px-4 py-3 shrink-0">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#98A2B2]">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="검색..."
                    className="w-full pl-8 pr-3 py-2 text-[14px] bg-[#F5F6F8] rounded-xl border-none outline-none text-[#25282A] placeholder:text-[#98A2B2]"
                    autoFocus
                  />
                </div>
              </div>
            )}
            <ul className="overflow-y-auto flex-1 px-2 pb-6">
              {isSearching ? (
                <>
                  {filtered.length === 0 ? (
                    <li className="py-10 text-center text-[14px] text-[#98A2B2]">결과 없음</li>
                  ) : (
                    filtered.map(o => renderMobileOption(o))
                  )}
                </>
              ) : (
                <>
                  {hasPinned && (
                    <>
                      <li className="px-3 py-1.5">
                        <span className="text-xs font-semibold text-[#0669F7]">★ 즐겨찾는 지역</span>
                      </li>
                      {pinnedOptions.map(o => renderMobileOption(o))}
                      <li className="h-px bg-[#EFF1F5] mx-2 my-2" />
                    </>
                  )}
                  {regularOptions.map(o => renderMobileOption(o))}
                </>
              )}
            </ul>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={open ? handleClose : handleOpen}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-xl bg-white transition-colors ${
          open && !isMobile
            ? 'border-[#0669F7] ring-2 ring-[#0669F7]'
            : 'border-[#EFF1F5] hover:border-[#C5CDD8]'
        }`}
      >
        <span className={value ? 'text-[#25282A]' : 'text-[#98A2B2]'}>
          {selectedLabel || placeholder}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          className={`text-[#98A2B2] transition-transform shrink-0 ml-1 ${open && !isMobile ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {desktopDropdown}
      {mobileSheet}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PublicHeaderSearch({ locale, basePath = '/jobs' }: PublicHeaderSearchProps) {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [province, setProvince] = useState('');
  const [trade, setTrade] = useState('');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Pinned provinces — only for logged-in users
  const [pinnedProvinces, setPinnedProvinces] = useState<string[]>([]);
  useEffect(() => {
    if (!isLoggedIn) { setPinnedProvinces([]); return; }
    try {
      const stored = localStorage.getItem('gada_pinned_provinces');
      if (stored) setPinnedProvinces(JSON.parse(stored));
    } catch { /* ignore */ }
  }, [isLoggedIn]);

  function togglePinProvince(slug: string) {
    setPinnedProvinces(prev => {
      const next = prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug];
      localStorage.setItem('gada_pinned_provinces', JSON.stringify(next));
      return next;
    });
  }

  const fetchData = async () => {
    if (dataFetched) return;
    try {
      const [provincesRes, tradesRes] = await Promise.all([
        fetch(`${API_BASE}/public/provinces?locale=${locale}`),
        fetch(`${API_BASE}/public/trades?locale=${locale}`),
      ]);
      if (provincesRes.ok) {
        const body = await provincesRes.json();
        setProvinces(body.data ?? []);
      }
      if (tradesRes.ok) {
        const body = await tradesRes.json();
        setTrades(body.data ?? []);
      }
      setDataFetched(true);
    } catch {
      // silently fail; user can still type keyword
    }
  };

  const openPanel = () => {
    setIsOpen(true);
    fetchData();
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());
    if (province) params.set('province', province);
    if (trade) params.set('trade', trade);
    router.push(`${basePath}?${params.toString()}` as never);
    closePanel();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside a SearchSelect portal (mobile bottom sheet rendered via createPortal)
      if (target.closest?.('[data-search-select-portal]')) return;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        closePanel();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Sort provinces alphabetically, mark pinned (only when logged in)
  const provinceOptions: SelectOption[] = useMemo(() => [
    { value: '', label: '전체 지역' },
    ...[...provinces]
      .sort((a, b) => a.nameVi.localeCompare(b.nameVi, 'vi'))
      .map(p => ({
        value: p.slug,
        label: locale === 'en' ? p.nameEn : p.nameVi,
        pinned: isLoggedIn ? pinnedProvinces.includes(p.slug) : false,
      })),
  ], [provinces, pinnedProvinces, isLoggedIn, locale]);

  const tradeOptions: SelectOption[] = trades.map((t) => ({
    value: String(t.id),
    label: locale === 'ko' ? t.nameKo : t.nameVi,
  }));

  return (
    <div className="relative">
      {/* Search icon button */}
      <button
        ref={buttonRef}
        type="button"
        aria-label="검색"
        aria-expanded={isOpen}
        onClick={isOpen ? closePanel : openPanel}
        className="flex items-center justify-center w-9 h-9 rounded-full text-[#25282A] hover:text-[#0669F7] hover:bg-[#EFF1F5] transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>

      {/* Search panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed top-14 left-0 right-0 bg-white border-b border-[#EFF1F5] shadow-lg z-40 p-4"
        >
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto flex flex-col gap-3">
            {/* Row 1: Keyword input */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                  className="text-[#98A2B2]" aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="공고명 또는 현장명 검색..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-[#EFF1F5] rounded-xl bg-white focus:ring-2 focus:ring-[#0669F7] focus:border-transparent outline-none"
                autoFocus
              />
            </div>

            {/* Row 2: Province + Trade selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SearchSelect
                value={province}
                onChange={setProvince}
                options={provinceOptions}
                placeholder="전체 지역"
                title="지역 선택"
                onTogglePin={isLoggedIn ? togglePinProvince : undefined}
              />
              <SearchSelect
                value={trade}
                onChange={setTrade}
                options={tradeOptions}
                placeholder="전체 직종"
                title="직종 선택"
              />
            </div>

            {/* Row 3: Submit button */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#0669F7] text-white text-sm font-bold hover:bg-[#0554D6] transition-colors"
            >
              검색하기
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
