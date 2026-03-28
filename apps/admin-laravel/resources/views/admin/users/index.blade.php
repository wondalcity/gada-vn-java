@extends('layouts.admin')
@section('title', '사용자 관리 | GADA Admin')
@section('page-title', '사용자 관리')

@section('content')

{{-- Filter bar --}}
<div class="bg-white rounded-lg border border-gray-200 mb-4 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
  {{-- Role filter tabs --}}
  <div class="flex gap-0.5">
    @foreach(['' => '전체', 'worker' => '근로자', 'manager' => '매니저', 'admin' => '관리자'] as $roleVal => $roleLabel)
    <a href="{{ request()->fullUrlWithQuery(['role' => $roleVal ?: null, 'page' => 1]) }}"
       class="px-3 py-1.5 text-xs font-medium rounded transition-colors
              {{ $role === $roleVal ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700' }}">
      {{ $roleLabel }}
    </a>
    @endforeach
  </div>

  {{-- Search --}}
  <form method="GET" action="/admin/users" class="flex items-center gap-2">
    @if($role)
      <input type="hidden" name="role" value="{{ $role }}">
    @endif
    <input type="text" name="q" value="{{ $search }}" placeholder="이름, 이메일, 전화번호 검색..."
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
          <th class="px-4 py-2.5 text-left font-medium">이름 / 이메일</th>
          <th class="px-4 py-2.5 text-left font-medium">전화번호</th>
          <th class="px-4 py-2.5 text-left font-medium">역할</th>
          <th class="px-4 py-2.5 text-left font-medium">프로필</th>
          <th class="px-4 py-2.5 text-left font-medium">상태</th>
          <th class="px-4 py-2.5 text-left font-medium">가입일</th>
          <th class="px-4 py-2.5 text-right font-medium">액션</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        @forelse($users as $user)
        @php
          // Merge auth.user_roles and auth.users.role for display
          $roles = array_filter(explode(',', $user->roles ?? ''));
          if (empty($roles) && !empty($user->role)) {
              $roles = [strtolower($user->role)];
          }
          $statusMap = [
            'ACTIVE'    => ['label' => '활성',   'class' => 'bg-green-100 text-green-700'],
            'SUSPENDED' => ['label' => '정지됨', 'class' => 'bg-red-100 text-red-600'],
            'DELETED'   => ['label' => '삭제됨', 'class' => 'bg-gray-100 text-gray-500'],
          ];
          $sc = $statusMap[$user->status] ?? ['label' => $user->status, 'class' => 'bg-gray-100 text-gray-500'];
        @endphp
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-2.5">
            <a href="/admin/users/{{ $user->id }}" class="font-medium text-gray-900 hover:text-blue-600 transition-colors block">
              {{ $user->full_name ?? '이름 없음' }}
            </a>
            <span class="text-gray-400 truncate block max-w-[180px]">{{ $user->email }}</span>
          </td>
          <td class="px-4 py-2.5 text-gray-500">{{ $user->phone ?? '—' }}</td>
          <td class="px-4 py-2.5">
            <div class="flex gap-1 flex-wrap">
              @forelse($roles as $r)
                @php
                  $roleConfig = [
                    'worker'     => 'bg-gray-100 text-gray-600',
                    'manager'    => 'bg-blue-100 text-blue-700',
                    'admin'      => 'bg-purple-100 text-purple-700',
                    'super_admin'=> 'bg-red-100 text-red-700',
                  ];
                  $rc = $roleConfig[$r] ?? 'bg-gray-100 text-gray-500';
                @endphp
                <span class="px-1.5 py-0.5 rounded text-xs font-medium {{ $rc }}">{{ $r }}</span>
              @empty
                <span class="text-gray-300">—</span>
              @endforelse
            </div>
          </td>
          <td class="px-4 py-2.5">
            @if($user->profile_complete)
              <span class="text-green-600 text-xs font-medium">✓ 완성</span>
            @else
              <span class="text-gray-400 text-xs">미완성</span>
            @endif
          </td>
          <td class="px-4 py-2.5">
            <span class="px-1.5 py-0.5 rounded text-xs font-medium {{ $sc['class'] }}">{{ $sc['label'] }}</span>
          </td>
          <td class="px-4 py-2.5 text-gray-400">
            {{ \Carbon\Carbon::parse($user->created_at)->format('Y-m-d') }}
          </td>
          <td class="px-4 py-2.5 text-right">
            <div class="flex items-center justify-end gap-1">
              <a href="/admin/users/{{ $user->id }}"
                 class="text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
                보기
              </a>
              @if($user->status === 'ACTIVE')
                <form method="POST" action="/admin/users/{{ $user->id }}/suspend" class="inline">
                  @csrf
                  <button type="submit"
                          onclick="return confirm('이 계정을 정지하시겠습니까?')"
                          class="bg-red-100 text-red-600 hover:bg-red-200 px-2 py-0.5 rounded font-medium transition-colors">
                    정지
                  </button>
                </form>
              @elseif($user->status === 'SUSPENDED')
                <form method="POST" action="/admin/users/{{ $user->id }}/activate" class="inline">
                  @csrf
                  <button type="submit"
                          class="bg-green-100 text-green-600 hover:bg-green-200 px-2 py-0.5 rounded font-medium transition-colors">
                    활성화
                  </button>
                </form>
              @endif
            </div>
          </td>
        </tr>
        @empty
        <tr>
          <td colspan="7" class="px-4 py-12 text-center text-sm text-gray-400">
            {{ $search ? "'{$search}'에 대한 검색 결과가 없습니다." : '사용자가 없습니다.' }}
          </td>
        </tr>
        @endforelse
      </tbody>
    </table>
  </div>

  {{-- Pagination --}}
  @if($users->hasPages())
  <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
    <span class="text-xs text-gray-400">총 {{ $users->total() }}명 중 {{ $users->firstItem() }}–{{ $users->lastItem() }}</span>
    <div class="flex gap-1">
      @if($users->onFirstPage())
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">이전</span>
      @else
        <a href="{{ $users->previousPageUrl() }}" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">이전</a>
      @endif
      @foreach($users->getUrlRange(max(1, $users->currentPage()-2), min($users->lastPage(), $users->currentPage()+2)) as $page => $url)
        <a href="{{ $url }}"
           class="px-2.5 py-1 text-xs rounded border transition-colors
                  {{ $page == $users->currentPage() ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50' }}">
          {{ $page }}
        </a>
      @endforeach
      @if($users->hasMorePages())
        <a href="{{ $users->nextPageUrl() }}" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">다음</a>
      @else
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">다음</span>
      @endif
    </div>
  </div>
  @endif
</div>

@endsection
