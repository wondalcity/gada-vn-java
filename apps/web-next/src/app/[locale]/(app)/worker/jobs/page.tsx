import { Suspense } from 'react'
import { fetchPublicJobs, fetchProvinces, fetchTrades, fetchWageStats } from '@/lib/api/public'
import { WorkerJobsClient } from '@/components/jobs/WorkerJobsClient'

interface Props {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    q?: string
    province?: string
    trade?: string
    page?: string
    lat?: string
    lng?: string
    radius?: string
    status?: string
    view?: string
    minWage?: string
    maxWage?: string
  }>
}

export const dynamic = 'force-dynamic'

export default async function WorkerJobsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q, province, trade, page: pageStr, lat, lng, radius, status, view, minWage, maxWage } = await searchParams

  const page = Math.max(1, Number(pageStr ?? 1))
  const tradeId = trade ? Number(trade) : undefined
  const selectedLat = lat ? Number(lat) : undefined
  const selectedLng = lng ? Number(lng) : undefined
  const selectedRadius = radius ? Number(radius) : 30
  const selectedMinWage = minWage ? Number(minWage) : undefined
  const selectedMaxWage = maxWage ? Number(maxWage) : undefined

  const [result, provinces, trades, wageStats] = await Promise.all([
    fetchPublicJobs({
      q: q?.trim() || undefined,
      provinceSlug: province,
      tradeId,
      page,
      locale,
      lat: selectedLat,
      lng: selectedLng,
      radiusKm: selectedLat != null ? selectedRadius : undefined,
      statusFilter: status,
      minWage: selectedMinWage,
      maxWage: selectedMaxWage,
    }),
    fetchProvinces(locale),
    fetchTrades(locale),
    fetchWageStats(),
  ])

  const { jobs, total, totalPages } = result

  const paginationParams: Record<string, string> = {}
  if (q)        paginationParams.q = q
  if (province) paginationParams.province = province
  if (trade)    paginationParams.trade = trade
  if (lat)      paginationParams.lat = lat
  if (lng)      paginationParams.lng = lng
  if (radius)   paginationParams.radius = radius
  if (status)   paginationParams.status = status
  if (minWage)  paginationParams.minWage = minWage
  if (maxWage)  paginationParams.maxWage = maxWage

  const geoActive = selectedLat != null && selectedLng != null

  const emptyMessage = q
    ? `"${q}" 검색 결과가 없습니다.`
    : geoActive
    ? '주변에 조건에 맞는 공고가 없습니다. 반경을 넓혀보세요.'
    : '조건에 맞는 공고가 없습니다.'

  const wageFilterActive = selectedMinWage != null || selectedMaxWage != null
  const activeFilterCount = [q, province, trade, geoActive ? 'geo' : null, status, wageFilterActive ? 'wage' : null].filter(Boolean).length

  return (
    <div className="max-w-[1760px] mx-auto">
      <Suspense>
        <WorkerJobsClient
          jobs={jobs}
          total={total}
          totalPages={totalPages}
          page={page}
          provinces={provinces}
          trades={trades}
          locale={locale}
          q={q}
          province={province}
          tradeId={tradeId}
          selectedLat={selectedLat}
          selectedLng={selectedLng}
          selectedRadius={selectedRadius}
          selectedStatus={status}
          selectedMinWage={selectedMinWage}
          selectedMaxWage={selectedMaxWage}
          wageStats={wageStats}
          paginationParams={paginationParams}
          geoActive={geoActive}
          emptyMessage={emptyMessage}
          activeFilterCount={activeFilterCount}
          initialView={view === 'map' ? 'map' : 'list'}
        />
      </Suspense>
    </div>
  )
}
