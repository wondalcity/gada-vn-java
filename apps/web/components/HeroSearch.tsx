'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

interface Trade {
  id: number;
  name_ko: string;
  name_vi?: string;
  name_en?: string;
}

interface Props {
  locale: string;
  trades: Trade[];
}

const PROVINCES = [
  { value: 'ho-chi-minh', ko: '호치민', vi: 'TP.HCM', en: 'Ho Chi Minh' },
  { value: 'hanoi', ko: '하노이', vi: 'Hà Nội', en: 'Hanoi' },
  { value: 'binh-duong', ko: '빈즈엉', vi: 'Bình Dương', en: 'Binh Duong' },
  { value: 'dong-nai', ko: '동나이', vi: 'Đồng Nai', en: 'Dong Nai' },
  { value: 'da-nang', ko: '다낭', vi: 'Đà Nẵng', en: 'Da Nang' },
  { value: 'vung-tau', ko: '붕따우', vi: 'Vũng Tàu', en: 'Vung Tau' },
  { value: 'binh-phuoc', ko: '빈프억', vi: 'Bình Phước', en: 'Binh Phuoc' },
  { value: 'ba-ria', ko: '바리아', vi: 'Bà Rịa', en: 'Ba Ria' },
  { value: 'long-an', ko: '롱안', vi: 'Long An', en: 'Long An' },
  { value: 'tay-ninh', ko: '떠이닌', vi: 'Tây Ninh', en: 'Tay Ninh' },
];

function tradeName(t: Trade, locale: string): string {
  if (locale === 'ko') return t.name_ko;
  if (locale === 'en') return t.name_en ?? t.name_ko;
  return t.name_vi ?? t.name_ko;
}

function provinceLabel(p: typeof PROVINCES[number], locale: string): string {
  if (locale === 'ko') return p.ko;
  if (locale === 'en') return p.en;
  return p.vi;
}

export default function HeroSearch({ locale, trades }: Props) {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [province, setProvince] = useState('');
  const [tradeId, setTradeId] = useState('');

  const isVi = locale === 'vi';
  const isEn = locale === 'en';

  const placeholder = isVi
    ? 'Tìm theo tên công việc hoặc công trường...'
    : isEn
    ? 'Search by job title or site name...'
    : '공고명 또는 현장명으로 검색...';

  const allRegions = isVi ? 'Tất cả khu vực' : isEn ? 'All Regions' : '전체 지역';
  const allTrades = isVi ? 'Tất cả ngành nghề' : isEn ? 'All Trades' : '전체 직종';
  const searchBtn = isVi ? 'Tìm kiếm' : isEn ? 'Search' : '검색';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (province) params.set('province', province);
    if (tradeId) params.set('tradeId', tradeId);
    const basePath = locale === 'ko' ? '/jobs' : `/${locale}/jobs`;
    router.push(`${basePath}${params.toString() ? '?' + params.toString() : ''}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 max-w-3xl mx-auto">
      <div className="bg-white/10 backdrop-blur rounded-2xl p-3 flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-white rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50 min-w-0"
        />
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="bg-white rounded-xl px-3 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
        >
          <option value="">{allRegions}</option>
          {PROVINCES.map((p) => (
            <option key={p.value} value={p.value}>{provinceLabel(p, locale)}</option>
          ))}
        </select>
        <select
          value={tradeId}
          onChange={(e) => setTradeId(e.target.value)}
          className="bg-white rounded-xl px-3 py-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
        >
          <option value="">{allTrades}</option>
          {trades.map((tr) => (
            <option key={tr.id} value={String(tr.id)}>{tradeName(tr, locale)}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-brand hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors whitespace-nowrap"
        >
          {searchBtn}
        </button>
      </div>
    </form>
  );
}
