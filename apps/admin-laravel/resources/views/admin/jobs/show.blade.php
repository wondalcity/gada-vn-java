@extends('layouts.admin')
@section('title', '공고 상세 | GADA Admin')
@section('page-title', '공고 상세')

@section('content')

<div class="flex items-center justify-between mb-4">
  <a href="/admin/jobs" class="text-xs text-gray-500 hover:text-gray-700 transition-colors">← 목록으로</a>
  <div class="flex items-center gap-2">
    @php
      $statusMap = [
        'OPEN'      => ['label' => '모집중', 'class' => 'bg-green-100 text-green-700 border-green-200'],
        'FILLED'    => ['label' => '마감',   'class' => 'bg-blue-100 text-blue-700 border-blue-200'],
        'COMPLETED' => ['label' => '완료',   'class' => 'bg-gray-100 text-gray-600 border-gray-200'],
        'CANCELLED' => ['label' => '취소',   'class' => 'bg-red-100 text-red-600 border-red-200'],
      ];
      $jsc = $statusMap[$job->status] ?? ['label' => $job->status, 'class' => 'bg-gray-100 text-gray-500 border-gray-200'];
    @endphp
    <span class="px-2.5 py-1 rounded-full text-xs font-semibold border {{ $jsc['class'] }}">{{ $jsc['label'] }}</span>
    @if($job->status === 'OPEN')
      <form method="POST" action="/admin/jobs/{{ $job->id }}/close" class="inline">
        @csrf
        <button type="submit"
                onclick="return confirm('이 공고를 마감(취소) 처리하시겠습니까?')"
                class="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded text-xs font-medium transition-colors">
          공고 마감
        </button>
      </form>
    @endif
  </div>
</div>

{{-- Job header --}}
<div class="bg-white rounded-lg border border-gray-200 p-5 mb-4">
  <h2 class="text-lg font-bold text-gray-900">{{ $job->title }}</h2>
  <div class="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
    <span>🏗️ {{ $job->site_name }}</span>
    @if($job->province) <span>📍 {{ $job->province }}</span> @endif
    @if($job->trade_name) <span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{{ $job->trade_name }}</span> @endif
    <span>매니저: {{ $job->manager_name }}</span>
  </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

  {{-- Job details --}}
  <div class="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
    <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">공고 상세</h3>
    <div class="grid grid-cols-2 gap-x-6 gap-y-3">
      <div>
        <dt class="text-xs text-gray-400 mb-0.5">일당</dt>
        <dd class="text-sm font-bold text-gray-900">{{ number_format($job->daily_wage) }}₫</dd>
      </div>
      @if($job->work_date)
      <div>
        <dt class="text-xs text-gray-400 mb-0.5">근무일</dt>
        <dd class="text-sm font-semibold text-gray-700">{{ \Carbon\Carbon::parse($job->work_date)->format('Y년 m월 d일 (D)') }}</dd>
      </div>
      @endif
      @if(isset($job->start_time) && $job->start_time)
      <div>
        <dt class="text-xs text-gray-400 mb-0.5">근무 시간</dt>
        <dd class="text-xs text-gray-700">{{ $job->start_time }} – {{ $job->end_time ?? '미정' }}</dd>
      </div>
      @endif
      <div>
        <dt class="text-xs text-gray-400 mb-0.5">모집 인원</dt>
        <dd class="text-sm font-semibold text-gray-700">
          {{ $job->slots_filled }} / {{ $job->slots_total }}명
          @if($job->slots_total > 0)
            <span class="text-xs text-gray-400 font-normal ml-1">
              ({{ round($job->slots_filled / $job->slots_total * 100) }}% 충원)
            </span>
          @endif
        </dd>
      </div>
      <div>
        <dt class="text-xs text-gray-400 mb-0.5">현장 주소</dt>
        <dd class="text-xs text-gray-700">{{ $job->address ?? '—' }}</dd>
      </div>
      @if(isset($job->published_at) && $job->published_at)
      <div>
        <dt class="text-xs text-gray-400 mb-0.5">게시일</dt>
        <dd class="text-xs text-gray-700">{{ \Carbon\Carbon::parse($job->published_at)->format('Y-m-d H:i') }}</dd>
      </div>
      @endif
      @if(isset($job->expires_at) && $job->expires_at)
      <div>
        <dt class="text-xs text-gray-400 mb-0.5">마감일</dt>
        <dd class="text-xs text-gray-700">{{ \Carbon\Carbon::parse($job->expires_at)->format('Y-m-d H:i') }}</dd>
      </div>
      @endif
    </div>
    @if(isset($job->description) && $job->description)
    <div class="mt-4 pt-3 border-t border-gray-100">
      <dt class="text-xs text-gray-400 mb-1">공고 설명</dt>
      <dd class="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{{ $job->description }}</dd>
    </div>
    @endif
  </div>

  {{-- Attendance summary --}}
  <div class="bg-white rounded-lg border border-gray-200 p-5">
    <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">출근 현황</h3>
    @php
      $attTotal = $attendance->sum();
    @endphp
    @if($attTotal > 0)
      <div class="space-y-2">
        @foreach(['ATTENDED'=>['label'=>'출근','color'=>'green'],'HALF_DAY'=>['label'=>'반차','color'=>'yellow'],
                  'ABSENT'=>['label'=>'결근','color'=>'red'],'PENDING'=>['label'=>'미확인','color'=>'gray']] as $s => $cfg)
          @php $cnt = $attendance->get($s, 0); @endphp
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full inline-block bg-{{ $cfg['color'] }}-400"></span>
              <span class="text-xs text-gray-500">{{ $cfg['label'] }}</span>
            </div>
            <span class="text-xs font-semibold text-gray-700">{{ $cnt }}</span>
          </div>
        @endforeach
        <div class="border-t border-gray-100 pt-2 flex justify-between">
          <span class="text-xs text-gray-400">전체</span>
          <span class="text-xs font-bold text-gray-900">{{ $attTotal }}</span>
        </div>
      </div>
    @else
      <p class="text-xs text-gray-400">출근 기록 없음</p>
    @endif
  </div>

</div>

{{-- Applications --}}
<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
  <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
    <h3 class="text-sm font-semibold text-gray-900">
      지원자 목록
      <span class="text-gray-400 font-normal">({{ $applications->count() }}명)</span>
    </h3>
  </div>
  @if($applications->isEmpty())
    <div class="px-4 py-10 text-center text-sm text-gray-400">지원자 없음</div>
  @else
  <div class="overflow-x-auto">
    <table class="w-full text-xs">
      <thead>
        <tr class="bg-gray-50 border-b border-gray-100 text-gray-500">
          <th class="px-4 py-2.5 text-left font-medium">이름</th>
          <th class="px-4 py-2.5 text-left font-medium">지원 상태</th>
          <th class="px-4 py-2.5 text-left font-medium">지원일시</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-50">
        @foreach($applications as $app)
        @php
          $appStatusMap = [
            'PENDING'  => ['label' => '검토중',   'class' => 'bg-yellow-100 text-yellow-700'],
            'ACCEPTED' => ['label' => '수락됨',   'class' => 'bg-green-100 text-green-700'],
            'REJECTED' => ['label' => '거절됨',   'class' => 'bg-red-100 text-red-600'],
            'CANCELLED'=> ['label' => '취소됨',   'class' => 'bg-gray-100 text-gray-500'],
          ];
          $asc = $appStatusMap[$app->status] ?? ['label' => $app->status, 'class' => 'bg-gray-100 text-gray-500'];
        @endphp
        <tr class="hover:bg-gray-50">
          <td class="px-4 py-2.5 font-medium text-gray-700">{{ $app->full_name ?? '—' }}</td>
          <td class="px-4 py-2.5">
            <span class="px-1.5 py-0.5 rounded text-xs font-medium {{ $asc['class'] }}">{{ $asc['label'] }}</span>
          </td>
          <td class="px-4 py-2.5 text-gray-400">
            {{ $app->applied_at ? \Carbon\Carbon::parse($app->applied_at)->format('Y-m-d H:i') : '—' }}
          </td>
        </tr>
        @endforeach
      </tbody>
    </table>
  </div>
  @endif
</div>

@endsection
