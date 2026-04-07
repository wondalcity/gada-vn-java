'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { createPortal } from 'react-dom';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.gada.vn/api/v1';

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
}

// ─── Bottom Sheet Select ──────────────────────────────────────────────────────

interface SelectOption {
  value: string;
  label: string;
}

interface BottomSheetSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder: string;
  title: string;
}

function BottomSheetSelect({
  value,
  onChange,
  options,
  placeholder,
  title,
}: BottomSheetSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';

  const filtered = search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = (v: string) => {
    onChange(v);
    setOpen(false);
    setSearch('');
  };

  const handleClose = () => {
    setOpen(false);
    setSearch('');
  };

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const sheet = open && mounted
    ? createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[75vh] animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[#D0D4DB]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#EFF1F5] shrink-0">
              <span className="text-[16px] font-bold text-[#25282A]">{title}</span>
              <button
                type="button"
                onClick={handleClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#EFF1F5] text-[#98A2B2]"
                aria-label="닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Search (only when many options) */}
            {options.length > 10 && (
              <div className="px-4 py-3 shrink-0">
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#98A2B2]">
                      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="검색..."
                    className="w-full pl-8 pr-3 py-2 text-[14px] bg-[#F5F6F8] rounded-xl border-none outline-none text-[#25282A] placeholder:text-[#98A2B2]"
                    autoFocus
                  />
                </div>
              </div>
            )}

            {/* Option list */}
            <ul className="overflow-y-auto flex-1 px-2 pb-6">
              {/* "전체" option */}
              <li>
                <button
                  type="button"
                  onClick={() => handleSelect('')}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[15px] transition-colors ${
                    value === ''
                      ? 'bg-[#EEF4FF] text-[#0669F7] font-semibold'
                      : 'text-[#25282A] hover:bg-[#F5F6F8]'
                  }`}
                >
                  <span>{placeholder}</span>
                  {value === '' && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[#0669F7]">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </li>

              {filtered.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(o.value)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-[15px] transition-colors ${
                      value === o.value
                        ? 'bg-[#EEF4FF] text-[#0669F7] font-semibold'
                        : 'text-[#25282A] hover:bg-[#F5F6F8]'
                    }`}
                  >
                    <span>{o.label}</span>
                    {value === o.value && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[#0669F7] shrink-0">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}

              {filtered.length === 0 && (
                <li className="py-10 text-center text-[14px] text-[#98A2B2]">결과 없음</li>
              )}
            </ul>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border rounded-xl bg-white transition-colors ${
          open
            ? 'border-[#0669F7] ring-2 ring-[#0669F7]'
            : 'border-[#EFF1F5] hover:border-[#C5CDD8]'
        }`}
      >
        <span className={value ? 'text-[#25282A]' : 'text-[#98A2B2]'}>
          {selectedLabel || placeholder}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          className={`text-[#98A2B2] transition-transform shrink-0 ml-1 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {sheet}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PublicHeaderSearch({ locale }: PublicHeaderSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [province, setProvince] = useState('');
  const [trade, setTrade] = useState('');
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchData = async () => {
    if (dataFetched) return;
    try {
      const [provincesRes, tradesRes] = await Promise.all([
        fetch(`${API_BASE}/public/provinces?locale=ko`),
        fetch(`${API_BASE}/public/trades?locale=ko`),
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
    router.push(`/${locale}/jobs?${params.toString()}` as never);
    closePanel();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closePanel();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
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

  const provinceOptions: SelectOption[] = provinces.map((p) => ({
    value: p.slug,
    label: p.nameVi,
  }));

  const tradeOptions: SelectOption[] = trades.map((t) => ({
    value: String(t.id),
    label: t.nameKo,
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
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
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
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-[#98A2B2]"
                  aria-hidden="true"
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
              <BottomSheetSelect
                value={province}
                onChange={setProvince}
                options={provinceOptions}
                placeholder="전체 지역"
                title="지역 선택"
              />
              <BottomSheetSelect
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
