@extends('layouts.admin')
@section('title', '사용자 상세 | GADA Admin')
@section('page-title', '사용자 상세')

@section('content')

<div class="flex items-center justify-between mb-4">
  <a href="/admin/users" class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
    ← 목록으로
  </a>
  @php
    $statusMap = [
      'ACTIVE'    => ['label' => '활성',   'class' => 'bg-green-100 text-green-700 border-green-200'],
      'SUSPENDED' => ['label' => '정지됨', 'class' => 'bg-red-100 text-red-600 border-red-200'],
      'DELETED'   => ['label' => '삭제됨', 'class' => 'bg-gray-100 text-gray-500 border-gray-200'],
    ];
    $sc = $statusMap[$user->status] ?? ['label' => $user->status, 'class' => 'bg-gray-100 text-gray-500 border-gray-200'];
  @endphp
  <div class="flex items-center gap-2">
    <span class="px-2.5 py-1 rounded-full text-xs font-semibold border {{ $sc['class'] }}">{{ $sc['label'] }}</span>
    @if($user->status === 'ACTIVE')
      <form method="POST" action="/admin/users/{{ $user->id }}/suspend" class="inline">
        @csrf
        <button type="submit"
                onclick="return confirm('이 계정을 정지하시겠습니까?')"
                class="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded text-xs font-medium transition-colors">
          계정 정지
        </button>
      </form>
    @elseif($user->status === 'SUSPENDED')
      <form method="POST" action="/admin/users/{{ $user->id }}/activate" class="inline">
        @csrf
        <button type="submit"
                class="bg-green-100 text-green-600 hover:bg-green-200 px-3 py-1.5 rounded text-xs font-medium transition-colors">
          계정 활성화
        </button>
      </form>
    @endif
    @if($user->status !== 'DELETED')
      <form method="POST" action="/admin/users/{{ $user->id }}" class="inline">
        @csrf
        @method('DELETE')
        <button type="submit"
                onclick="return confirm('계정을 삭제(DELETED 상태로 변경)하시겠습니까?')"
                class="bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded text-xs font-medium transition-colors">
          삭제
        </button>
      </form>
    @endif
  </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

  {{-- User Info --}}
  <div class="bg-white rounded-lg border border-gray-200 p-5">
    <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">기본 정보</h3>
    <dl class="space-y-2.5">
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">이름</dt>
        <dd class="text-xs text-gray-700 font-medium">{{ $workerProfile->full_name ?? $user->name ?? '—' }}</dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">이메일</dt>
        <dd class="text-xs text-gray-700">{{ $user->email ?? '—' }}</dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">전화번호</dt>
        <dd class="text-xs text-gray-700">{{ $user->phone ?? '—' }}</dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">상태</dt>
        <dd class="text-xs">
          <span class="px-1.5 py-0.5 rounded font-medium {{ $sc['class'] }}">{{ $sc['label'] }}</span>
        </dd>
      </div>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">가입일</dt>
        <dd class="text-xs text-gray-700">{{ \Carbon\Carbon::parse($user->created_at)->format('Y-m-d H:i') }}</dd>
      </div>
      @if(isset($user->locale))
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">언어</dt>
        <dd class="text-xs text-gray-700">{{ strtoupper($user->locale) }}</dd>
      </div>
      @endif
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">User ID</dt>
        <dd class="text-xs text-gray-400 font-mono truncate max-w-[160px]" title="{{ $user->id }}">{{ $user->id }}</dd>
      </div>
    </dl>
  </div>

  {{-- Roles & Profile --}}
  <div class="space-y-4">
    {{-- Roles --}}
    <div class="bg-white rounded-lg border border-gray-200 p-5">
      <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">역할</h3>
      @if($roles->isEmpty())
        <p class="text-xs text-gray-400">부여된 역할 없음</p>
      @else
        <div class="space-y-1.5">
          @foreach($roles as $role)
          @php
            $roleConfig = [
              'worker'     => 'bg-gray-100 text-gray-600',
              'manager'    => 'bg-blue-100 text-blue-700',
              'admin'      => 'bg-purple-100 text-purple-700',
              'super_admin'=> 'bg-red-100 text-red-700',
            ];
            $rc = $roleConfig[$role->role] ?? 'bg-gray-100 text-gray-500';
          @endphp
          <div class="flex items-center justify-between">
            <span class="px-2 py-0.5 rounded text-xs font-medium {{ $rc }}">{{ $role->role }}</span>
            <div class="text-xs text-gray-400">
              @if($role->revoked_at)
                <span class="text-red-400">취소됨 {{ \Carbon\Carbon::parse($role->revoked_at)->format('m/d') }}</span>
              @else
                <span class="text-green-600">활성</span>
                @if($role->granted_at)
                  · {{ \Carbon\Carbon::parse($role->granted_at)->format('Y-m-d') }}
                @endif
              @endif
            </div>
          </div>
          @endforeach
        </div>
      @endif
    </div>

    {{-- Application count --}}
    <div class="bg-white rounded-lg border border-gray-200 p-4">
      <div class="flex items-center justify-between">
        <p class="text-xs text-gray-500">총 공고 지원 횟수</p>
        <p class="text-xl font-black text-gray-900">{{ $applicationCount }}</p>
      </div>
    </div>
  </div>

</div>

{{-- Worker Profile --}}
@if($workerProfile)
<div class="bg-white rounded-lg border border-gray-200 p-5 mb-4">
  <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
    근로자 프로필
    @if($workerProfile->profile_complete)
      <span class="ml-1.5 bg-green-100 text-green-700 text-xs px-1.5 py-0.5 rounded font-medium">완성됨</span>
    @else
      <span class="ml-1.5 bg-yellow-100 text-yellow-700 text-xs px-1.5 py-0.5 rounded font-medium">미완성</span>
    @endif
  </h3>
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
    @foreach([
      ['label'=>'이름', 'value'=>$workerProfile->full_name ?? null],
      ['label'=>'전화번호', 'value'=>$workerProfile->phone ?? null],
      ['label'=>'성별', 'value'=>isset($workerProfile->gender) ? ($workerProfile->gender === 'MALE' ? '남성' : '여성') : null],
      ['label'=>'생년월일', 'value'=>isset($workerProfile->dob) ? \Carbon\Carbon::parse($workerProfile->dob)->format('Y-m-d') : null],
      ['label'=>'국적', 'value'=>$workerProfile->nationality ?? null],
    ] as $field)
      @if($field['value'])
      <div>
        <dt class="text-xs text-gray-400">{{ $field['label'] }}</dt>
        <dd class="text-xs text-gray-700 mt-0.5">{{ $field['value'] }}</dd>
      </div>
      @endif
    @endforeach
  </div>
</div>
@endif

{{-- Manager Profile --}}
@if($managerProfile)
<div class="bg-white rounded-lg border border-gray-200 p-5 mb-4">
  <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
    매니저 프로필
    @php
      $approvalConfig = [
        'PENDING'  => ['label' => '승인 대기', 'class' => 'bg-amber-100 text-amber-700'],
        'APPROVED' => ['label' => '승인됨', 'class' => 'bg-green-100 text-green-700'],
        'REJECTED' => ['label' => '반려됨', 'class' => 'bg-red-100 text-red-700'],
      ];
      $apc = $approvalConfig[$managerProfile->approval_status] ?? ['label' => $managerProfile->approval_status, 'class' => 'bg-gray-100 text-gray-600'];
    @endphp
    <span class="ml-1.5 text-xs px-1.5 py-0.5 rounded font-medium {{ $apc['class'] }}">{{ $apc['label'] }}</span>
  </h3>
  <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
    <div>
      <dt class="text-xs text-gray-400">대표자명</dt>
      <dd class="text-xs text-gray-700 mt-0.5">{{ $managerProfile->representative_name ?? '—' }}</dd>
    </div>
    <div>
      <dt class="text-xs text-gray-400">회사명</dt>
      <dd class="text-xs text-gray-700 mt-0.5">{{ $managerProfile->company_name ?? '—' }}</dd>
    </div>
    <div>
      <dt class="text-xs text-gray-400">사업 유형</dt>
      <dd class="text-xs text-gray-700 mt-0.5">
        {{ $managerProfile->business_type === 'CORPORATE' ? '법인' : '개인' }}
      </dd>
    </div>
    <div>
      <dt class="text-xs text-gray-400">연락처</dt>
      <dd class="text-xs text-gray-700 mt-0.5">{{ $managerProfile->contact_phone ?? '—' }}</dd>
    </div>
    <div>
      <dt class="text-xs text-gray-400">지역</dt>
      <dd class="text-xs text-gray-700 mt-0.5">{{ $managerProfile->province ?? '—' }}</dd>
    </div>
  </div>
  <div class="mt-3">
    <a href="/admin/approvals/{{ $managerProfile->id }}" class="text-xs text-blue-600 hover:underline">
      매니저 신청 상세 보기 →
    </a>
  </div>
</div>
@endif

{{-- Recent Audit Activity --}}
@if($recentActivity->isNotEmpty())
<div class="bg-white rounded-lg border border-gray-200 p-5">
  <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">최근 활동 로그</h3>
  <div class="space-y-1.5">
    @foreach($recentActivity as $log)
    <div class="flex items-start gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span class="text-xs text-gray-400 shrink-0 w-32">
        {{ \Carbon\Carbon::parse($log->created_at)->format('m-d H:i') }}
      </span>
      <span class="text-xs font-medium text-gray-600 shrink-0">{{ $log->action }}</span>
      <span class="text-xs text-gray-400">{{ $log->entity_type }} #{{ $log->entity_id }}</span>
      @if($log->ip_address)
        <span class="text-xs text-gray-300 ml-auto shrink-0">{{ $log->ip_address }}</span>
      @endif
    </div>
    @endforeach
  </div>
</div>
@endif

@endsection
