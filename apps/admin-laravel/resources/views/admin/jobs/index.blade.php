@extends('layouts.admin')
@section('title', '공고 관리 | GADA Admin')
@section('page-title', '공고 관리')

@section('content')

{{-- Filter bar --}}
<div class="bg-white rounded-lg border border-gray-200 mb-4 px-4 py-3 flex flex-wrap items-center gap-3">
  {{-- Status filter --}}
  <div class="flex gap-0.5">
    @foreach(['' => '전체', 'OPEN' => '모집중', 'FILLED' => '마감', 'COMPLETED' => '완료', 'CANCELLED' => '취소'] as $statusVal => $statusLabel)
    <a href="{{ request()->fullUrlWithQuery(['status' => $statusVal ?: null, 'page' => 1]) }}"
       class="px-3 py-1.5 text-xs font-medium rounded transition-colors
              {{ $status === $statusVal ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700' }}">
      {{ $statusLabel }}
    </a>
    @endforeach
  </div>

  <div class="flex items-center gap-2 ml-auto flex-wrap">
    {{-- Trade filter --}}
    <form method="GET" action="/admin/jobs" id="filter-form" class="flex items-center gap-2 flex-wrap">
      @if($status)
        <input type="hidden" name="status" value="{{ $status }}">
      @endif
      <select name="trade" onchange="document.getElementById('filter-form').submit()"
              class="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">전체 직종</option>
        @foreach($trades as $trade)
          <option value="{{ $trade->id }}" {{ $tradeId == $trade->id ? 'selected' : '' }}>
            {{ $trade->name_ko }}
          </option>
        @endforeach
      </select>

      {{-- Search --}}
      <input type="text" name="q" value="{{ $search }}" placeholder="공고명, 현장, 매니저 검색..."
             class="border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-52">
      <button type="submit" class="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 transition-colors font-medium">검색</button>
      @if($search || $tradeId)
        <a href="/admin/jobs{{ $status ? '?status='.$status : '' }}" class="text-xs text-gray-400 hover:text-gray-600">초기화</a>
      @endif
    </form>
  </div>
</div>

{{-- Table --}}
<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-xs">
      <thead>
        <tr class="bg-gray-50 border-b border-gray-200 text-gray-500">
          <th class="px-4 py-2.5 text-left font-medium">공고명</th>
          <th class="px-4 py-2.5 text-left font-medium">현장</th>
          <th class="px-4 py-2.5 text-left font-medium">지역</th>
          <th class="px-4 py-2.5 text-left font-medium">직종</th>
          <th class="px-4 py-2.5 text-right font-medium">일당 (₫)</th>
          <th class="px-4 py-2.5 text-left font-medium">근무일</th>
          <th class="px-4 py-2.5 text-center font-medium">모집현황</th>
          <th class="px-4 py-2.5 text-left font-medium">상태</th>
          <th class="px-4 py-2.5 text-left font-medium">생성일</th>
          <th class="px-4 py-2.5 text-right font-medium">액션</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        @forelse($jobs as $job)
        @php
          $statusMap = [
            'OPEN'      => ['label' => '모집중', 'class' => 'bg-green-100 text-green-700'],
            'FILLED'    => ['label' => '마감',   'class' => 'bg-blue-100 text-blue-700'],
            'COMPLETED' => ['label' => '완료',   'class' => 'bg-gray-100 text-gray-600'],
            'CANCELLED' => ['label' => '취소',   'class' => 'bg-red-100 text-red-600'],
          ];
          $jsc = $statusMap[$job->status] ?? ['label' => $job->status, 'class' => 'bg-gray-100 text-gray-500'];
        @endphp
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-2.5">
            <a href="/admin/jobs/{{ $job->id }}" class="font-medium text-gray-900 hover:text-blue-600 transition-colors block truncate max-w-[160px]">
              {{ $job->title }}
            </a>
          </td>
          <td class="px-4 py-2.5 text-gray-600 truncate max-w-[120px]">{{ $job->site_name }}</td>
          <td class="px-4 py-2.5 text-gray-400">{{ $job->province ?? '—' }}</td>
          <td class="px-4 py-2.5 text-gray-500">{{ $job->trade_name ?? '—' }}</td>
          <td class="px-4 py-2.5 text-right font-medium text-gray-700">{{ number_format($job->daily_wage) }}</td>
          <td class="px-4 py-2.5 text-gray-500">
            {{ $job->work_date ? \Carbon\Carbon::parse($job->work_date)->format('m/d') : '—' }}
          </td>
          <td class="px-4 py-2.5 text-center">
            <div class="flex items-center justify-center gap-0.5">
              <span class="{{ $job->slots_filled >= $job->slots_total ? 'text-red-600' : 'text-gray-700' }} font-medium">
                {{ $job->slots_filled }}
              </span>
              <span class="text-gray-400">/{{ $job->slots_total }}</span>
            </div>
            @if($job->slots_total > 0)
            <div class="w-12 bg-gray-100 rounded-full h-1 mx-auto mt-0.5">
              <div class="bg-blue-500 h-1 rounded-full"
                   style="width:{{ min(100, round($job->slots_filled / $job->slots_total * 100)) }}%"></div>
            </div>
            @endif
          </td>
          <td class="px-4 py-2.5">
            <span class="px-1.5 py-0.5 rounded text-xs font-medium {{ $jsc['class'] }}">{{ $jsc['label'] }}</span>
          </td>
          <td class="px-4 py-2.5 text-gray-400">{{ \Carbon\Carbon::parse($job->created_at)->format('m-d') }}</td>
          <td class="px-4 py-2.5 text-right">
            <div class="flex items-center justify-end gap-1">
              <a href="/admin/jobs/{{ $job->id }}"
                 class="text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
                보기
              </a>
              @if($job->status === 'OPEN')
                <form method="POST" action="/admin/jobs/{{ $job->id }}/close" class="inline">
                  @csrf
                  <button type="submit"
                          onclick="return confirm('이 공고를 마감(취소)하시겠습니까?')"
                          class="bg-red-100 text-red-600 hover:bg-red-200 px-2 py-0.5 rounded font-medium transition-colors">
                    마감
                  </button>
                </form>
              @endif
            </div>
          </td>
        </tr>
        @empty
        <tr>
          <td colspan="10" class="px-4 py-12 text-center text-sm text-gray-400">
            {{ $search ? "'{$search}'에 대한 검색 결과가 없습니다." : '등록된 공고가 없습니다.' }}
          </td>
        </tr>
        @endforelse
      </tbody>
    </table>
  </div>

  {{-- Pagination --}}
  @if($jobs->hasPages())
  <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
    <span class="text-xs text-gray-400">총 {{ $jobs->total() }}건 중 {{ $jobs->firstItem() }}–{{ $jobs->lastItem() }}</span>
    <div class="flex gap-1">
      @if($jobs->onFirstPage())
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">이전</span>
      @else
        <a href="{{ $jobs->previousPageUrl() }}" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">이전</a>
      @endif
      @foreach($jobs->getUrlRange(max(1, $jobs->currentPage()-2), min($jobs->lastPage(), $jobs->currentPage()+2)) as $page => $url)
        <a href="{{ $url }}"
           class="px-2.5 py-1 text-xs rounded border transition-colors
                  {{ $page == $jobs->currentPage() ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50' }}">
          {{ $page }}
        </a>
      @endforeach
      @if($jobs->hasMorePages())
        <a href="{{ $jobs->nextPageUrl() }}" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">다음</a>
      @else
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">다음</span>
      @endif
    </div>
  </div>
  @endif
</div>

@endsection
