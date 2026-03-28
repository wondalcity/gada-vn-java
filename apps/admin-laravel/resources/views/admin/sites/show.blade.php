@extends('layouts.admin')
@section('title', '현장 상세 | GADA Admin')
@section('page-title', '현장 상세')

@section('content')

<div class="flex items-center justify-between mb-4">
  <a href="/admin/sites" class="text-xs text-gray-500 hover:text-gray-700 transition-colors">← 목록으로</a>
  <div class="flex items-center gap-2">
    @php
      $sc = $site->status === 'ACTIVE'
        ? 'bg-green-100 text-green-700 border-green-200'
        : 'bg-gray-100 text-gray-500 border-gray-200';
    @endphp
    <span class="px-2.5 py-1 rounded-full text-xs font-semibold border {{ $sc }}">
      {{ $site->status === 'ACTIVE' ? '활성' : '비활성' }}
    </span>
    @if($site->status === 'ACTIVE')
      <form method="POST" action="/admin/sites/{{ $site->id }}/deactivate" class="inline">
        @csrf
        <button type="submit"
                onclick="return confirm('이 현장을 비활성화하고 활성 공고를 모두 취소하시겠습니까?')"
                class="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded text-xs font-medium transition-colors">
          현장 비활성화
        </button>
      </form>
    @endif
  </div>
</div>

{{-- Site header --}}
<div class="bg-white rounded-lg border border-gray-200 p-5 mb-4">
  <h2 class="text-lg font-bold text-gray-900">{{ $site->name }}</h2>
  <p class="text-sm text-gray-500 mt-0.5">{{ $site->address }}</p>
  <div class="flex items-center gap-3 mt-2 flex-wrap text-xs text-gray-400">
    @if($site->province)
      <span>📍 {{ $site->province }}</span>
    @endif
    @if(isset($site->district))
      <span>· {{ $site->district }}</span>
    @endif
    @if(isset($site->site_type))
      <span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{{ $site->site_type }}</span>
    @endif
    <span>· 생성: {{ \Carbon\Carbon::parse($site->created_at)->format('Y-m-d') }}</span>
  </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
  {{-- Manager info --}}
  <div class="bg-white rounded-lg border border-gray-200 p-5">
    <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">매니저 정보</h3>
    <dl class="space-y-2.5">
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-20 shrink-0">대표자</dt>
        <dd class="text-xs text-gray-700 font-medium">{{ $site->manager_name }}</dd>
      </div>
      @if($site->company_name)
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-20 shrink-0">회사명</dt>
        <dd class="text-xs text-gray-700">{{ $site->company_name }}</dd>
      </div>
      @endif
    </dl>
  </div>

  {{-- Map coords --}}
  <div class="bg-white rounded-lg border border-gray-200 p-5">
    <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">위치 정보</h3>
    <dl class="space-y-2.5">
      @if(isset($site->lat) && $site->lat)
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-20 shrink-0">위도</dt>
        <dd class="text-xs text-gray-700 font-mono">{{ $site->lat }}</dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-20 shrink-0">경도</dt>
        <dd class="text-xs text-gray-700 font-mono">{{ $site->lng }}</dd>
      </div>
      <div class="mt-2">
        <a href="https://maps.google.com/?q={{ $site->lat }},{{ $site->lng }}" target="_blank" rel="noopener"
           class="text-xs text-blue-600 hover:underline">
          Google Maps에서 보기 →
        </a>
      </div>
      @else
        <p class="text-xs text-gray-400">위치 정보 없음</p>
      @endif
    </dl>
  </div>

  {{-- Job stats --}}
  <div class="bg-white rounded-lg border border-gray-200 p-5">
    <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">공고 현황</h3>
    @php
      $openCount     = $jobs->where('status', 'OPEN')->count();
      $filledCount   = $jobs->where('status', 'FILLED')->count();
      $completedCount= $jobs->where('status', 'COMPLETED')->count();
      $cancelledCount= $jobs->where('status', 'CANCELLED')->count();
    @endphp
    <div class="space-y-2">
      <div class="flex justify-between text-xs">
        <span class="text-gray-400">모집중</span>
        <span class="font-semibold text-blue-600">{{ $openCount }}</span>
      </div>
      <div class="flex justify-between text-xs">
        <span class="text-gray-400">마감</span>
        <span class="font-semibold text-gray-700">{{ $filledCount }}</span>
      </div>
      <div class="flex justify-between text-xs">
        <span class="text-gray-400">완료</span>
        <span class="font-semibold text-green-600">{{ $completedCount }}</span>
      </div>
      <div class="flex justify-between text-xs">
        <span class="text-gray-400">취소</span>
        <span class="text-gray-400">{{ $cancelledCount }}</span>
      </div>
      <div class="flex justify-between text-xs border-t border-gray-100 pt-2 mt-2">
        <span class="text-gray-500 font-medium">전체</span>
        <span class="font-bold text-gray-900">{{ $jobs->count() }}</span>
      </div>
    </div>
  </div>
</div>

{{-- Jobs table --}}
<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
  <div class="px-4 py-3 border-b border-gray-100">
    <h3 class="text-sm font-semibold text-gray-900">이 현장의 공고</h3>
  </div>
  @if($jobs->isEmpty())
    <div class="px-4 py-10 text-center text-sm text-gray-400">등록된 공고 없음</div>
  @else
  <div class="overflow-x-auto">
    <table class="w-full text-xs">
      <thead>
        <tr class="bg-gray-50 border-b border-gray-100 text-gray-500">
          <th class="px-4 py-2.5 text-left font-medium">공고명</th>
          <th class="px-4 py-2.5 text-left font-medium">직종</th>
          <th class="px-4 py-2.5 text-left font-medium">근무일</th>
          <th class="px-4 py-2.5 text-right font-medium">일당 (₫)</th>
          <th class="px-4 py-2.5 text-center font-medium">모집현황</th>
          <th class="px-4 py-2.5 text-left font-medium">상태</th>
          <th class="px-4 py-2.5 text-right font-medium">액션</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50">
        @foreach($jobs as $job)
        @php
          $statusMap = ['OPEN'=>['label'=>'모집중','class'=>'bg-green-100 text-green-700'],
                        'FILLED'=>['label'=>'마감','class'=>'bg-blue-100 text-blue-700'],
                        'COMPLETED'=>['label'=>'완료','class'=>'bg-gray-100 text-gray-600'],
                        'CANCELLED'=>['label'=>'취소','class'=>'bg-red-100 text-red-600']];
          $jsc = $statusMap[$job->status] ?? ['label'=>$job->status,'class'=>'bg-gray-100 text-gray-500'];
        @endphp
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-2.5">
            <a href="/admin/jobs/{{ $job->id }}" class="font-medium text-gray-900 hover:text-blue-600 transition-colors truncate block max-w-[160px]">
              {{ $job->title }}
            </a>
          </td>
          <td class="px-4 py-2.5 text-gray-500">{{ $job->trade_name ?? '—' }}</td>
          <td class="px-4 py-2.5 text-gray-500">{{ $job->work_date ? \Carbon\Carbon::parse($job->work_date)->format('Y-m-d') : '—' }}</td>
          <td class="px-4 py-2.5 text-right font-medium text-gray-700">{{ number_format($job->daily_wage) }}</td>
          <td class="px-4 py-2.5 text-center">
            <span class="{{ $job->slots_filled >= $job->slots_total ? 'text-red-600' : 'text-gray-700' }} font-medium">
              {{ $job->slots_filled }}
            </span>
            <span class="text-gray-400">/{{ $job->slots_total }}</span>
          </td>
          <td class="px-4 py-2.5">
            <span class="px-1.5 py-0.5 rounded text-xs font-medium {{ $jsc['class'] }}">{{ $jsc['label'] }}</span>
          </td>
          <td class="px-4 py-2.5 text-right">
            <a href="/admin/jobs/{{ $job->id }}" class="text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
              보기
            </a>
          </td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif
</div>

@endsection
