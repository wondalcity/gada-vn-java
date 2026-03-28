@extends('layouts.admin')
@section('title', '현장 관리 | GADA Admin')
@section('page-title', '현장 관리')

@section('content')

{{-- Filter bar --}}
<div class="bg-white rounded-lg border border-gray-200 mb-4 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
  {{-- Status tabs --}}
  <div class="flex gap-0.5">
    @foreach(['' => '전체', 'ACTIVE' => '활성', 'INACTIVE' => '비활성'] as $statusVal => $statusLabel)
    <a href="{{ request()->fullUrlWithQuery(['status' => $statusVal ?: null, 'page' => 1]) }}"
       class="px-3 py-1.5 text-xs font-medium rounded transition-colors
              {{ $status === $statusVal ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700' }}">
      {{ $statusLabel }}
    </a>
    @endforeach
  </div>

  {{-- Search --}}
  <form method="GET" action="/admin/sites" class="flex items-center gap-2">
    @if($status)
      <input type="hidden" name="status" value="{{ $status }}">
    @endif
    <input type="text" name="q" value="{{ $search }}" placeholder="현장명, 주소, 매니저 검색..."
           class="border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-56">
    <button type="submit" class="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 transition-colors font-medium">검색</button>
    @if($search)
      <a href="{{ request()->fullUrlWithQuery(['q' => null]) }}" class="text-xs text-gray-400 hover:text-gray-600">초기화</a>
    @endif
  </form>
</div>

{{-- Table --}}
<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-xs">
      <thead>
        <tr class="bg-gray-50 border-b border-gray-200 text-gray-500">
          <th class="px-4 py-2.5 text-left font-medium">현장명</th>
          <th class="px-4 py-2.5 text-left font-medium">주소</th>
          <th class="px-4 py-2.5 text-left font-medium">지역</th>
          <th class="px-4 py-2.5 text-left font-medium">매니저</th>
          <th class="px-4 py-2.5 text-center font-medium">활성공고</th>
          <th class="px-4 py-2.5 text-center font-medium">전체공고</th>
          <th class="px-4 py-2.5 text-left font-medium">상태</th>
          <th class="px-4 py-2.5 text-left font-medium">생성일</th>
          <th class="px-4 py-2.5 text-right font-medium">액션</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        @forelse($sites as $site)
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-2.5">
            <a href="/admin/sites/{{ $site->id }}" class="font-medium text-gray-900 hover:text-blue-600 transition-colors block truncate max-w-[160px]">
              {{ $site->name }}
            </a>
          </td>
          <td class="px-4 py-2.5 text-gray-500 max-w-[160px] truncate">{{ $site->address ?? '—' }}</td>
          <td class="px-4 py-2.5 text-gray-500">{{ $site->province ?? '—' }}</td>
          <td class="px-4 py-2.5">
            <span class="text-gray-700 font-medium block truncate max-w-[120px]">{{ $site->manager_name }}</span>
            @if($site->company_name)
              <span class="text-gray-400 truncate block max-w-[120px]">{{ $site->company_name }}</span>
            @endif
          </td>
          <td class="px-4 py-2.5 text-center">
            <span class="{{ $site->open_jobs > 0 ? 'text-blue-600 font-semibold' : 'text-gray-400' }}">
              {{ $site->open_jobs }}
            </span>
          </td>
          <td class="px-4 py-2.5 text-center text-gray-500">{{ $site->total_jobs }}</td>
          <td class="px-4 py-2.5">
            @php
              $sc = $site->status === 'ACTIVE'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-500';
            @endphp
            <span class="px-1.5 py-0.5 rounded text-xs font-medium {{ $sc }}">
              {{ $site->status === 'ACTIVE' ? '활성' : '비활성' }}
            </span>
          </td>
          <td class="px-4 py-2.5 text-gray-400">
            {{ \Carbon\Carbon::parse($site->created_at)->format('Y-m-d') }}
          </td>
          <td class="px-4 py-2.5 text-right">
            <div class="flex items-center justify-end gap-1">
              <a href="/admin/sites/{{ $site->id }}"
                 class="text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
                보기
              </a>
              @if($site->status === 'ACTIVE')
                <form method="POST" action="/admin/sites/{{ $site->id }}/deactivate" class="inline">
                  @csrf
                  <button type="submit"
                          onclick="return confirm('이 현장을 비활성화하고 활성 공고를 취소하시겠습니까?')"
                          class="bg-red-100 text-red-600 hover:bg-red-200 px-2 py-0.5 rounded font-medium transition-colors">
                    비활성화
                  </button>
                </form>
              @endif
            </div>
          </td>
        </tr>
        @empty
        <tr>
          <td colspan="9" class="px-4 py-12 text-center text-sm text-gray-400">
            {{ $search ? "'{$search}'에 대한 검색 결과가 없습니다." : '등록된 현장이 없습니다.' }}
          </td>
        </tr>
        @endforelse
      </tbody>
    </table>
  </div>

  {{-- Pagination --}}
  @if($sites->hasPages())
  <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
    <span class="text-xs text-gray-400">총 {{ $sites->total() }}개 중 {{ $sites->firstItem() }}–{{ $sites->lastItem() }}</span>
    <div class="flex gap-1">
      @if($sites->onFirstPage())
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">이전</span>
      @else
        <a href="{{ $sites->previousPageUrl() }}" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">이전</a>
      @endif
      @foreach($sites->getUrlRange(max(1, $sites->currentPage()-2), min($sites->lastPage(), $sites->currentPage()+2)) as $page => $url)
        <a href="{{ $url }}"
           class="px-2.5 py-1 text-xs rounded border transition-colors
                  {{ $page == $sites->currentPage() ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50' }}">
          {{ $page }}
        </a>
      @endforeach
      @if($sites->hasMorePages())
        <a href="{{ $sites->nextPageUrl() }}" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">다음</a>
      @else
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">다음</span>
      @endif
    </div>
  </div>
  @endif
</div>

@endsection
