@extends('layouts.admin')
@section('title', '승인 관리 | GADA Admin')
@section('page-title', '매니저 승인 관리')

@section('content')

{{-- Filter tabs + search --}}
<div class="bg-white rounded-lg border border-gray-200 mb-4">
  <div class="px-4 pt-4 pb-0 flex flex-wrap items-center justify-between gap-3">
    {{-- Status tabs --}}
    <div class="flex gap-0.5">
      @php
        $tabs = [
          'PENDING'  => ['label' => '대기중',  'color' => 'amber'],
          'APPROVED' => ['label' => '승인됨',  'color' => 'green'],
          'REJECTED' => ['label' => '반려됨',  'color' => 'red'],
        ];
        $totalCount = $counts->sum();
      @endphp
      @foreach($tabs as $tabStatus => $tab)
        @php $cnt = $counts->get($tabStatus, 0); @endphp
        <a href="{{ request()->fullUrlWithQuery(['status' => $tabStatus, 'page' => 1]) }}"
           class="px-3 py-2 text-xs font-medium border-b-2 transition-colors
                  {{ $status === $tabStatus
                     ? 'border-blue-600 text-blue-700'
                     : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300' }}">
          {{ $tab['label'] }}
          <span class="ml-1 px-1.5 py-0.5 rounded-full text-xs
            {{ $status === $tabStatus ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500' }}">
            {{ $cnt }}
          </span>
        </a>
      @endforeach
    </div>
    {{-- Search --}}
    <form method="GET" action="/admin/approvals" class="flex items-center gap-2">
      <input type="hidden" name="status" value="{{ $status }}">
      <input type="text" name="q" value="{{ $search }}" placeholder="이름, 이메일, 회사명 검색..."
             class="border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-56">
      <button type="submit" class="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 transition-colors font-medium">검색</button>
      @if($search)
        <a href="{{ request()->fullUrlWithQuery(['q' => null]) }}" class="text-xs text-gray-400 hover:text-gray-600">초기화</a>
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
          <th class="px-4 py-2.5 text-left font-medium">신청자</th>
          <th class="px-4 py-2.5 text-left font-medium">사업 유형</th>
          <th class="px-4 py-2.5 text-left font-medium">회사명</th>
          <th class="px-4 py-2.5 text-left font-medium">지역</th>
          <th class="px-4 py-2.5 text-left font-medium">연락처</th>
          <th class="px-4 py-2.5 text-left font-medium">신청일</th>
          <th class="px-4 py-2.5 text-left font-medium">상태</th>
          <th class="px-4 py-2.5 text-right font-medium">액션</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        @forelse($profiles as $profile)
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-2.5">
            <a href="/admin/approvals/{{ $profile->id }}" class="font-medium text-gray-900 hover:text-blue-600 transition-colors block">
              {{ $profile->representative_name ?? '—' }}
            </a>
            <span class="text-gray-400 truncate block max-w-[160px]">{{ $profile->email }}</span>
          </td>
          <td class="px-4 py-2.5">
            <span class="px-1.5 py-0.5 rounded text-xs font-medium
              {{ $profile->business_type === 'CORPORATE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700' }}">
              {{ $profile->business_type === 'CORPORATE' ? '법인' : '개인' }}
            </span>
          </td>
          <td class="px-4 py-2.5 text-gray-600 max-w-[140px] truncate">{{ $profile->company_name ?? '—' }}</td>
          <td class="px-4 py-2.5 text-gray-500">{{ $profile->province ?? '—' }}</td>
          <td class="px-4 py-2.5 text-gray-500">{{ $profile->contact_phone ?? $profile->user_phone ?? '—' }}</td>
          <td class="px-4 py-2.5 text-gray-400">
            <span title="{{ $profile->created_at }}">
              {{ \Carbon\Carbon::parse($profile->created_at)->format('Y-m-d') }}
            </span>
            <span class="block text-gray-300">{{ \Carbon\Carbon::parse($profile->created_at)->diffForHumans() }}</span>
          </td>
          <td class="px-4 py-2.5">
            @php
              $statusConfig = [
                'PENDING'  => ['label' => '대기중', 'class' => 'bg-amber-100 text-amber-700'],
                'APPROVED' => ['label' => '승인됨', 'class' => 'bg-green-100 text-green-700'],
                'REJECTED' => ['label' => '반려됨', 'class' => 'bg-red-100 text-red-700'],
              ];
              $sc = $statusConfig[$profile->approval_status] ?? ['label' => $profile->approval_status, 'class' => 'bg-gray-100 text-gray-600'];
            @endphp
            <span class="px-1.5 py-0.5 rounded text-xs font-medium {{ $sc['class'] }}">{{ $sc['label'] }}</span>
          </td>
          <td class="px-4 py-2.5 text-right">
            <div class="flex items-center justify-end gap-1">
              <a href="/admin/approvals/{{ $profile->id }}"
                 class="text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
                상세
              </a>
              @if($profile->approval_status === 'PENDING')
                <form method="POST" action="/admin/approvals/{{ $profile->id }}/approve" class="inline">
                  @csrf
                  <button type="submit"
                          onclick="return confirm('{{ $profile->representative_name ?? $profile->email }} 을(를) 승인하시겠습니까?')"
                          class="bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded font-medium transition-colors">
                    승인
                  </button>
                </form>
                <button onclick="openReject('{{ $profile->id }}')"
                        class="bg-red-100 text-red-700 hover:bg-red-200 px-2 py-0.5 rounded font-medium transition-colors">
                  반려
                </button>
              @endif
            </div>
          </td>
        </tr>
        @empty
        <tr>
          <td colspan="8" class="px-4 py-12 text-center text-sm text-gray-400">
            {{ $search ? "'{$search}'에 대한 검색 결과가 없습니다." : '해당 상태의 신청이 없습니다.' }}
          </td>
        </tr>
        @endforelse
      </tbody>
    </table>
  </div>

  {{-- Pagination --}}
  @if($profiles->hasPages())
  <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
    <span class="text-xs text-gray-400">
      총 {{ $profiles->total() }}건 중 {{ $profiles->firstItem() }}–{{ $profiles->lastItem() }}
    </span>
    <div class="flex gap-1">
      @if($profiles->onFirstPage())
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">이전</span>
      @else
        <a href="{{ $profiles->previousPageUrl() }}" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">이전</a>
      @endif
      @foreach($profiles->getUrlRange(max(1, $profiles->currentPage()-2), min($profiles->lastPage(), $profiles->currentPage()+2)) as $page => $url)
        <a href="{{ $url }}"
           class="px-2.5 py-1 text-xs rounded border transition-colors
                  {{ $page == $profiles->currentPage() ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50' }}">
          {{ $page }}
        </a>
      @endforeach
      @if($profiles->hasMorePages())
        <a href="{{ $profiles->nextPageUrl() }}" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">다음</a>
      @else
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">다음</span>
      @endif
    </div>
  </div>
  @endif
</div>

{{-- Reject modal --}}
<div id="reject-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
    <h3 class="font-semibold text-gray-900 mb-1">승인 반려</h3>
    <p class="text-xs text-gray-400 mb-4">반려 사유를 입력하면 신청자에게 전달됩니다.</p>
    <form id="reject-form" method="POST">
      @csrf
      <div class="mb-4">
        <label class="block text-xs font-medium text-gray-700 mb-1">
          반려 사유 <span class="text-red-500">*</span>
        </label>
        <textarea name="reason" required minlength="5" maxlength="500" rows="3"
                  class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  placeholder="반려 사유를 구체적으로 입력하세요 (최소 5자)"></textarea>
        <p class="text-xs text-gray-400 mt-1">최소 5자 · 최대 500자</p>
      </div>
      <div class="flex gap-2 justify-end">
        <button type="button" onclick="closeReject()"
                class="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 transition-colors">
          취소
        </button>
        <button type="submit"
                class="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors">
          반려 처리
        </button>
      </div>
    </form>
  </div>
</div>

@endsection

@push('scripts')
<script>
function openReject(id) {
  document.getElementById('reject-form').action = '/admin/approvals/' + id + '/reject';
  document.getElementById('reject-modal').classList.remove('hidden');
  document.querySelector('#reject-form textarea[name="reason"]').value = '';
  setTimeout(() => document.querySelector('#reject-form textarea[name="reason"]').focus(), 50);
}
function closeReject() {
  document.getElementById('reject-modal').classList.add('hidden');
}
document.getElementById('reject-modal').addEventListener('click', function(e) {
  if (e.target === this) closeReject();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') closeReject();
});
</script>
@endpush
