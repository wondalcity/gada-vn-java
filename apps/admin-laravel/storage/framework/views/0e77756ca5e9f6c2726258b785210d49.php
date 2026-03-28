<?php $__env->startSection('title', '대시보드 | GADA Admin'); ?>
<?php $__env->startSection('page-title', '대시보드'); ?>

<?php $__env->startSection('content'); ?>


<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">

  
  <a href="/admin/approvals" class="bg-white rounded-lg border <?php echo e($pendingApprovals > 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-200'); ?> p-4 hover:shadow-sm transition-shadow block">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs text-gray-500 font-medium">대기 중인 승인</p>
        <p class="text-2xl font-black <?php echo e($pendingApprovals > 0 ? 'text-amber-600' : 'text-gray-900'); ?> mt-1"><?php echo e($pendingApprovals); ?></p>
      </div>
      <span class="text-xl opacity-70">✅</span>
    </div>
    <?php if($pendingApprovals > 0): ?>
      <p class="text-xs text-amber-600 mt-2 font-medium">즉시 처리 필요 →</p>
    <?php else: ?>
      <p class="text-xs text-gray-400 mt-2">모두 처리됨</p>
    <?php endif; ?>
  </a>

  
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs text-gray-500 font-medium">활성 공고</p>
        <p class="text-2xl font-black text-blue-600 mt-1"><?php echo e($activeJobs); ?></p>
      </div>
      <span class="text-xl opacity-70">💼</span>
    </div>
    <p class="text-xs text-gray-400 mt-2">
      마감: <span class="text-gray-600 font-medium"><?php echo e($filledJobs); ?></span>건
      · 완료: <span class="text-gray-600 font-medium"><?php echo e($completedJobs); ?></span>건
    </p>
  </div>

  
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs text-gray-500 font-medium">전체 공고</p>
        <p class="text-2xl font-black text-gray-900 mt-1"><?php echo e($totalJobs); ?></p>
      </div>
      <span class="text-xl opacity-70">🏗️</span>
    </div>
    <p class="text-xs text-gray-400 mt-2">완료: <?php echo e($completedJobs); ?>건</p>
  </div>

  
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs text-gray-500 font-medium">총 사용자</p>
        <p class="text-2xl font-black text-gray-900 mt-1"><?php echo e(number_format($totalUsers)); ?></p>
      </div>
      <span class="text-xl opacity-70">👥</span>
    </div>
    <p class="text-xs mt-2 <?php echo e($userGrowthPct >= 0 ? 'text-green-600' : 'text-red-600'); ?> font-medium">
      <?php echo e($userGrowthPct >= 0 ? '▲' : '▼'); ?> <?php echo e(abs($userGrowthPct)); ?>%
      <span class="text-gray-400 font-normal">· 이번주 +<?php echo e($newUsersThisWeek); ?>명</span>
    </p>
  </div>

</div>


<div class="bg-white rounded-lg border border-gray-200 p-4 mb-6">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-sm font-semibold text-gray-900">
      오늘의 출근 현황
      <span class="text-gray-400 font-normal ml-1"><?php echo e(now()->setTimezone('Asia/Ho_Chi_Minh')->format('Y년 m월 d일')); ?></span>
    </h3>
    <span class="text-xs text-gray-400">전체 <?php echo e($totalToday); ?>명 등록</span>
  </div>
  <div class="flex items-center gap-6 mb-3">
    <span class="flex items-center gap-1.5 text-sm">
      <span class="w-2.5 h-2.5 bg-green-500 rounded-full inline-block"></span>
      <span class="font-semibold text-green-700"><?php echo e($attendedToday); ?></span>
      <span class="text-gray-400 text-xs">출근</span>
    </span>
    <span class="flex items-center gap-1.5 text-sm">
      <span class="w-2.5 h-2.5 bg-yellow-400 rounded-full inline-block"></span>
      <span class="font-semibold text-yellow-700"><?php echo e($halfDayToday); ?></span>
      <span class="text-gray-400 text-xs">반차</span>
    </span>
    <span class="flex items-center gap-1.5 text-sm">
      <span class="w-2.5 h-2.5 bg-red-400 rounded-full inline-block"></span>
      <span class="font-semibold text-red-700"><?php echo e($absentToday); ?></span>
      <span class="text-gray-400 text-xs">결근</span>
    </span>
    <span class="flex items-center gap-1.5 text-sm">
      <span class="w-2.5 h-2.5 bg-gray-300 rounded-full inline-block"></span>
      <span class="font-semibold text-gray-600"><?php echo e($pendingToday); ?></span>
      <span class="text-gray-400 text-xs">미확인</span>
    </span>
  </div>
  <?php if($totalToday > 0): ?>
  <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden flex">
    <div style="width:<?php echo e(round($attendedToday / $totalToday * 100)); ?>%" class="bg-green-500 h-full"></div>
    <div style="width:<?php echo e(round($halfDayToday / $totalToday * 100)); ?>%" class="bg-yellow-400 h-full"></div>
    <div style="width:<?php echo e(round($absentToday / $totalToday * 100)); ?>%" class="bg-red-400 h-full"></div>
    <div style="width:<?php echo e(round($pendingToday / $totalToday * 100)); ?>%" class="bg-gray-300 h-full"></div>
  </div>
  <?php else: ?>
  <div class="w-full bg-gray-100 rounded-full h-1.5"></div>
  <p class="text-xs text-gray-400 mt-1">오늘 출근 데이터 없음</p>
  <?php endif; ?>
</div>


<div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">

  
  <div class="xl:col-span-2 bg-white rounded-lg border border-gray-200">
    <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-900">
        대기 중인 승인 요청
        <?php if($pendingApprovals > 0): ?>
          <span class="ml-1.5 bg-amber-100 text-amber-700 text-xs font-bold px-1.5 py-0.5 rounded-full"><?php echo e($pendingApprovals); ?></span>
        <?php endif; ?>
      </h3>
      <a href="/admin/approvals" class="text-xs text-blue-600 hover:underline">전체 보기 →</a>
    </div>
    <?php if($pendingList->isEmpty()): ?>
      <div class="px-4 py-10 text-center">
        <p class="text-sm text-gray-400">대기 중인 승인 요청이 없습니다.</p>
        <p class="text-xs text-gray-300 mt-1">모든 요청이 처리되었습니다 ✓</p>
      </div>
    <?php else: ?>
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="text-gray-400 bg-gray-50 border-b border-gray-100">
            <th class="px-4 py-2 text-left font-medium">신청자</th>
            <th class="px-4 py-2 text-left font-medium">유형</th>
            <th class="px-4 py-2 text-left font-medium">회사명</th>
            <th class="px-4 py-2 text-left font-medium">연락처</th>
            <th class="px-4 py-2 text-left font-medium">신청일</th>
            <th class="px-4 py-2 text-right font-medium">처리</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <?php $__currentLoopData = $pendingList; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
          <tr class="hover:bg-gray-50">
            <td class="px-4 py-2.5">
              <a href="/admin/approvals/<?php echo e($item->id); ?>" class="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                <?php echo e($item->representative_name ?? '—'); ?>

              </a>
              <p class="text-gray-400 truncate max-w-[140px]"><?php echo e($item->email); ?></p>
            </td>
            <td class="px-4 py-2.5">
              <span class="px-1.5 py-0.5 rounded text-xs font-medium
                <?php echo e($item->business_type === 'CORPORATE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'); ?>">
                <?php echo e($item->business_type === 'CORPORATE' ? '법인' : '개인'); ?>

              </span>
            </td>
            <td class="px-4 py-2.5 text-gray-600 max-w-[120px] truncate"><?php echo e($item->company_name ?? '—'); ?></td>
            <td class="px-4 py-2.5 text-gray-500"><?php echo e($item->contact_phone ?? '—'); ?></td>
            <td class="px-4 py-2.5 text-gray-400">
              <?php echo e(\Carbon\Carbon::parse($item->created_at)->diffForHumans()); ?>

            </td>
            <td class="px-4 py-2.5 text-right">
              <div class="flex items-center justify-end gap-1">
                <form method="POST" action="/admin/approvals/<?php echo e($item->id); ?>/approve" class="inline">
                  <?php echo csrf_field(); ?>
                  <button type="submit"
                          onclick="return confirm('<?php echo e($item->representative_name ?? $item->email); ?> 을(를) 승인하시겠습니까?')"
                          class="bg-green-100 text-green-700 hover:bg-green-200 px-2 py-0.5 rounded font-medium transition-colors">
                    승인
                  </button>
                </form>
                <button onclick="openReject('<?php echo e($item->id); ?>')"
                        class="bg-red-100 text-red-700 hover:bg-red-200 px-2 py-0.5 rounded font-medium transition-colors">
                  반려
                </button>
              </div>
            </td>
          </tr>
          <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tbody>
      </table>
    </div>
    <?php endif; ?>
  </div>

  
  <div class="space-y-4">

    
    <div class="bg-white rounded-lg border border-gray-200">
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-900">최근 생성 현장</h3>
        <a href="/admin/sites" class="text-xs text-blue-600 hover:underline">전체 →</a>
      </div>
      <ul class="divide-y divide-gray-50">
        <?php $__empty_1 = true; $__currentLoopData = $recentSites; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $site): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
        <li class="px-4 py-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <a href="/admin/sites/<?php echo e($site->id); ?>" class="text-xs font-medium text-gray-900 hover:text-blue-600 truncate block">
                <?php echo e($site->name); ?>

              </a>
              <p class="text-xs text-gray-400 truncate"><?php echo e($site->province); ?> · <?php echo e($site->manager_name); ?></p>
            </div>
            <div class="text-right shrink-0">
              <span class="text-xs text-gray-400"><?php echo e(\Carbon\Carbon::parse($site->created_at)->format('m/d')); ?></span>
              <p class="text-xs <?php echo e($site->status === 'ACTIVE' ? 'text-green-600' : 'text-gray-400'); ?> font-medium">
                <?php echo e($site->status === 'ACTIVE' ? '활성' : ($site->status === 'INACTIVE' ? '비활성' : $site->status)); ?>

              </p>
            </div>
          </div>
        </li>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
        <li class="px-4 py-5 text-center text-xs text-gray-400">등록된 현장 없음</li>
        <?php endif; ?>
      </ul>
    </div>

    
    <div class="bg-white rounded-lg border border-gray-200">
      <div class="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-gray-900">최근 생성 공고</h3>
        <a href="/admin/jobs" class="text-xs text-blue-600 hover:underline">전체 →</a>
      </div>
      <ul class="divide-y divide-gray-50">
        <?php $__empty_1 = true; $__currentLoopData = $recentJobs; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $job): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
        <li class="px-4 py-2.5">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <a href="/admin/jobs/<?php echo e($job->id); ?>" class="text-xs font-medium text-gray-900 hover:text-blue-600 truncate block">
                <?php echo e($job->title); ?>

              </a>
              <p class="text-xs text-gray-400 truncate"><?php echo e($job->site_name); ?> · <?php echo e(number_format($job->daily_wage)); ?>₫</p>
            </div>
            <div class="text-right shrink-0">
              <span class="text-xs px-1.5 py-0.5 rounded-full font-medium
                <?php echo e($job->status === 'OPEN' ? 'bg-green-100 text-green-700' : ($job->status === 'FILLED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500')); ?>">
                <?php
                  $statusMap = ['OPEN'=>'모집중','FILLED'=>'마감','COMPLETED'=>'완료','CANCELLED'=>'취소'];
                ?>
                <?php echo e($statusMap[$job->status] ?? $job->status); ?>

              </span>
              <p class="text-xs text-gray-400 mt-0.5"><?php echo e($job->slots_filled); ?>/<?php echo e($job->slots_total); ?>명</p>
            </div>
          </div>
        </li>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
        <li class="px-4 py-5 text-center text-xs text-gray-400">등록된 공고 없음</li>
        <?php endif; ?>
      </ul>
    </div>

  </div>
</div>


<div class="bg-white rounded-lg border border-gray-200 p-4">
  <div class="flex items-center justify-between mb-3">
    <h3 class="text-sm font-semibold text-gray-900">신규 사용자 추이 <span class="text-gray-400 font-normal text-xs">(최근 14일)</span></h3>
    <span class="text-xs text-gray-400">총 <?php echo e(array_sum($growthData)); ?>명 가입</span>
  </div>
  <div class="flex items-end gap-1 h-16">
    <?php $maxVal = max(array_merge($growthData, [1])); ?>
    <?php $__currentLoopData = $growthData; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $i => $count): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <div class="flex-1 flex flex-col items-center gap-0.5 group relative">
      <div class="w-full rounded-sm transition-colors <?php echo e($count > 0 ? 'bg-blue-400 hover:bg-blue-500' : 'bg-gray-100'); ?>"
           style="height: <?php echo e(max(2, round($count / $maxVal * 52))); ?>px">
      </div>
      <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 shadow-lg">
        <?php echo e($growthLabels[$i]); ?>: <?php echo e($count); ?>명
      </div>
    </div>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </div>
  <div class="flex gap-1 mt-1.5">
    <?php $__currentLoopData = $growthLabels; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $i => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <div class="flex-1 text-center text-gray-400" style="font-size:9px"><?php echo e($i % 3 === 0 ? $label : ''); ?></div>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </div>
</div>


<div id="reject-modal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
  <div class="bg-white rounded-lg shadow-2xl w-full max-w-sm p-6">
    <h3 class="font-semibold text-gray-900 mb-1">승인 반려</h3>
    <p class="text-xs text-gray-400 mb-4">반려 사유를 입력하면 신청자에게 전달됩니다.</p>
    <form id="reject-form" method="POST">
      <?php echo csrf_field(); ?>
      <div class="mb-4">
        <label class="block text-xs font-medium text-gray-700 mb-1">
          반려 사유 <span class="text-red-500">*</span>
        </label>
        <textarea name="reason" required minlength="5" maxlength="500" rows="3"
                  class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  placeholder="반려 사유를 구체적으로 입력하세요 (최소 5자)"></textarea>
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

<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
<script>
function openReject(id) {
  document.getElementById('reject-form').action = '/admin/approvals/' + id + '/reject';
  document.getElementById('reject-modal').classList.remove('hidden');
  document.querySelector('#reject-form textarea[name="reason"]').value = '';
  document.querySelector('#reject-form textarea[name="reason"]').focus();
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
<?php $__env->stopPush(); ?>

<?php echo $__env->make('layouts.admin', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Users/leewonyuep/gada-vn/apps/admin-laravel/resources/views/admin/dashboard/index.blade.php ENDPATH**/ ?>