/**
 * Free construction site images from Unsplash (no API key required for direct photo URLs).
 * Used as dummy placeholders when job/site has no uploaded images.
 */
export const DUMMY_CONSTRUCTION_IMAGES: string[] = [
  'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80', // scaffolding
  'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80', // building construction
  'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=800&q=80', // modern building
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80', // architecture
  'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=800&q=80', // house frame
  'https://images.unsplash.com/photo-1590955559496-50316bd28ff7?auto=format&fit=crop&w=800&q=80', // construction worker
  'https://images.unsplash.com/photo-1565008575538-4f6e95a7af09?auto=format&fit=crop&w=800&q=80', // excavator
  'https://images.unsplash.com/photo-1576867757603-05b134ebc379?auto=format&fit=crop&w=800&q=80', // construction site
]

/**
 * Trade-specific images keyed by Korean trade name keywords.
 * Checked in order — first matching keyword wins.
 */
const TRADE_IMAGE_MAP: Array<{ keywords: string[]; url: string }> = [
  {
    keywords: ['토목', '굴착', '터파기', '지반'],
    url: 'https://images.unsplash.com/photo-1565008575538-4f6e95a7af09?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['철근', '철골', '용접', '금속', '스틸'],
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['목공', '목재', '목수', '가구'],
    url: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['전기', '전선', '배선', '통신', '전자'],
    url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['배관', '설비', '위생', '냉난방', 'HVAC', '보일러'],
    url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['도장', '페인트', '도색'],
    url: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['타일', '석재', '석공', '대리석', '화강암'],
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['콘크리트', '미장', '방수', '형틀', '거푸집'],
    url: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['조적', '벽돌', '블록', '석축'],
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['가설', '비계', '지지', '안전망'],
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['내장', '인테리어', '마감', '단열', '천장', '바닥'],
    url: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=800&q=80',
  },
  {
    keywords: ['건축', '현장', '공사', '시공', '일반'],
    url: 'https://images.unsplash.com/photo-1576867757603-05b134ebc379?auto=format&fit=crop&w=800&q=80',
  },
]

/**
 * Pick a trade-specific image based on Korean trade name.
 * Falls back to a deterministic hash-based image if no trade keyword matches.
 */
export function pickTradeImage(tradeNameKo?: string | null, jobId?: string): string {
  if (tradeNameKo) {
    const name = tradeNameKo.trim()
    for (const entry of TRADE_IMAGE_MAP) {
      if (entry.keywords.some((kw) => name.includes(kw))) {
        return entry.url
      }
    }
  }
  // Fallback: deterministic hash-based selection
  return pickDummyImage(jobId ?? tradeNameKo ?? 'default')
}

/**
 * Pick a deterministic dummy image for a job card based on job id.
 * Same job always gets the same image.
 */
export function pickDummyImage(jobId: string): string {
  let hash = 0
  for (let i = 0; i < jobId.length; i++) {
    hash = (hash * 31 + jobId.charCodeAt(i)) >>> 0
  }
  return DUMMY_CONSTRUCTION_IMAGES[hash % DUMMY_CONSTRUCTION_IMAGES.length]
}
