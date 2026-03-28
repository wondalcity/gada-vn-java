'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

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
        const data = await provincesRes.json();
        setProvinces(data);
      }
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        setTrades(data);
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
    params.set('view', 'map');
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

  return (
    <div className="relative">
      {/* Search icon button */}
      <button
        ref={buttonRef}
        type="button"
        aria-label="검색"
        aria-expanded={isOpen}
        onClick={isOpen ? closePanel : openPanel}
        className="flex items-center justify-center w-9 h-9 rounded-full text-[#98A2B2] hover:text-[#0669F7] hover:bg-[#EFF1F5] transition-colors"
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
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="px-3 py-2 text-sm border border-[#EFF1F5] rounded-xl bg-white focus:ring-2 focus:ring-[#0669F7] focus:border-transparent outline-none w-full"
              >
                <option value="">전체 지역</option>
                {provinces.map((p) => (
                  <option key={p.code} value={p.slug}>
                    {p.nameVi}
                  </option>
                ))}
              </select>

              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="px-3 py-2 text-sm border border-[#EFF1F5] rounded-xl bg-white focus:ring-2 focus:ring-[#0669F7] focus:border-transparent outline-none w-full"
              >
                <option value="">전체 직종</option>
                {trades.map((t) => (
                  <option key={t.id} value={t.code}>
                    {t.nameKo}
                  </option>
                ))}
              </select>
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
