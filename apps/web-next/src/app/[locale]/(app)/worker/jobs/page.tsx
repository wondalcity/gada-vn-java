import { Suspense } from 'react'
import { fetchPublicJobs, fetchProvinces, fetchTrades } from '@/lib/api/public'
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
  }>
}

export const dynamic = 'force-dynamic'

export default async function WorkerJobsPage({ params, searchParams }: Props) {
  const { locale } = await params
  const { q, province, trade, page: pageStr, lat, lng, radius, status, view } = await searchParams

  const page = Math.max(1, Number(pageStr ?? 1))
  const tradeId = trade ? Number(trade) : undefined
  const selectedLat = lat ? Number(lat) : undefined
  const selectedLng = lng ? Number(lng) : undefined
  const selectedRadius = radius ? Number(radius) : 30

  const [result, provinces, trades] = await Promise.all([
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
    }),
    fetchProvinces(locale),
    fetchTrades(locale),
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

  const geoActive = selectedLat != null && selectedLng != null

  const emptyMessage = q
    ? `"${q}" 검색 결과가 없습니다.`
    : geoActive
    ? '주변에 조건에 맞는 공고가 없습니다. 반경을 넓혀보세요.'
    : '조건에 맞는 공고가 없습니다.'

  const activeFilterCount = [q, province, trade, geoActive ? 'geo' : null, status].filter(Boolean).length

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
