<?php $__env->startSection('title', '공고 관리 | GADA Admin'); ?>
<?php $__env->startSection('page-title', '공고 관리'); ?>

<?php $__env->startSection('content'); ?>


<div class="bg-white rounded-lg border border-gray-200 mb-4 px-4 py-3 flex flex-wrap items-center gap-3">
  
  <div class="flex gap-0.5">
    <?php $__currentLoopData = ['' => '전체', 'OPEN' => '모집중', 'FILLED' => '마감', 'COMPLETED' => '완료', 'CANCELLED' => '취소']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $statusVal => $statusLabel): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <a href="<?php echo e(request()->fullUrlWithQuery(['status' => $statusVal ?: null, 'page' => 1])); ?>"
       class="px-3 py-1.5 text-xs font-medium rounded transition-colors
              <?php echo e($status === $statusVal ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'); ?>">
      <?php echo e($statusLabel); ?>

    </a>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </div>

  <div class="flex items-center gap-2 ml-auto flex-wrap">
    
    <form method="GET" action="/admin/jobs" id="filter-form" class="flex items-center gap-2 flex-wrap">
      <?php if($status): ?>
        <input type="hidden" name="status" value="<?php echo e($status); ?>">
      <?php endif; ?>
      <select name="trade" onchange="document.getElementById('filter-form').submit()"
              class="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">전체 직종</option>
        <?php $__currentLoopData = $trades; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $trade): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
          <option value="<?php echo e($trade->id); ?>" <?php echo e($tradeId == $trade->id ? 'selected' : ''); ?>>
            <?php echo e($trade->name_ko); ?>

          </option>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
      </select>

      
      <input type="text" name="q" value="<?php echo e($search); ?>" placeholder="공고명, 현장, 매니저 검색..."
             class="border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-52">
      <button type="submit" class="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 transition-colors font-medium">검색</button>
      <?php if($search || $tradeId): ?>
        <a href="/admin/jobs<?php echo e($status ? '?status='.$status : ''); ?>" class="text-xs text-gray-400 hover:text-gray-600">초기화</a>
      <?php endif; ?>
    </form>
  </div>
</div>


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
        <?php $__empty_1 = true; $__currentLoopData = $jobs; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $job): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
        <?php
          $statusMap = [
            'OPEN'      => ['label' => '모집중', 'class' => 'bg-green-100 text-green-700'],
            'FILLED'    => ['label' => '마감',   'class' => 'bg-blue-100 text-blue-700'],
            'COMPLETED' => ['label' => '완료',   'class' => 'bg-gray-100 text-gray-600'],
            'CANCELLED' => ['label' => '취소',   'class' => 'bg-red-100 text-red-600'],
          ];
          $jsc = $statusMap[$job->status] ?? ['label' => $job->status, 'class' => 'bg-gray-100 text-gray-500'];
        ?>
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-2.5">
            <a href="/admin/jobs/<?php echo e($job->id); ?>" class="font-medium text-gray-900 hover:text-blue-600 transition-colors block truncate max-w-[160px]">
              <?php echo e($job->title); ?>

            </a>
          </td>
          <td class="px-4 py-2.5 text-gray-600 truncate max-w-[120px]"><?php echo e($job->site_name); ?></td>
          <td class="px-4 py-2.5 text-gray-400"><?php echo e($job->province ?? '—'); ?></td>
          <td class="px-4 py-2.5 text-gray-500"><?php echo e($job->trade_name ?? '—'); ?></td>
          <td class="px-4 py-2.5 text-right font-medium text-gray-700"><?php echo e(number_format($job->daily_wage)); ?></td>
          <td class="px-4 py-2.5 text-gray-500">
            <?php echo e($job->work_date ? \Carbon\Carbon::parse($job->work_date)->format('m/d') : '—'); ?>

          </td>
          <td class="px-4 py-2.5 text-center">
            <div class="flex items-center justify-center gap-0.5">
              <span class="<?php echo e($job->slots_filled >= $job->slots_total ? 'text-red-600' : 'text-gray-700'); ?> font-medium">
                <?php echo e($job->slots_filled); ?>

              </span>
              <span class="text-gray-400">/<?php echo e($job->slots_total); ?></span>
            </div>
            <?php if($job->slots_total > 0): ?>
            <div class="w-12 bg-gray-100 rounded-full h-1 mx-auto mt-0.5">
              <div class="bg-blue-500 h-1 rounded-full"
                   style="width:<?php echo e(min(100, round($job->slots_filled / $job->slots_total * 100))); ?>%"></div>
            </div>
            <?php endif; ?>
          </td>
          <td class="px-4 py-2.5">
            <span class="px-1.5 py-0.5 rounded text-xs font-medium <?php echo e($jsc['class']); ?>"><?php echo e($jsc['label']); ?></span>
          </td>
          <td class="px-4 py-2.5 text-gray-400"><?php echo e(\Carbon\Carbon::parse($job->created_at)->format('m-d')); ?></td>
          <td class="px-4 py-2.5 text-right">
            <div class="flex items-center justify-end gap-1">
              <a href="/admin/jobs/<?php echo e($job->id); ?>"
                 class="text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
                보기
              </a>
              <?php if($job->status === 'OPEN'): ?>
                <form method="POST" action="/admin/jobs/<?php echo e($job->id); ?>/close" class="inline">
                  <?php echo csrf_field(); ?>
                  <button type="submit"
                          onclick="return confirm('이 공고를 마감(취소)하시겠습니까?')"
                          class="bg-red-100 text-red-600 hover:bg-red-200 px-2 py-0.5 rounded font-medium transition-colors">
                    마감
                  </button>
                </form>
              <?php endif; ?>
            </div>
          </td>
        </tr>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
        <tr>
          <td colspan="10" class="px-4 py-12 text-center text-sm text-gray-400">
            <?php echo e($search ? "'{$search}'에 대한 검색 결과가 없습니다." : '등록된 공고가 없습니다.'); ?>

          </td>
        </tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>

  
  <?php if($jobs->hasPages()): ?>
  <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
    <span class="text-xs text-gray-400">총 <?php echo e($jobs->total()); ?>건 중 <?php echo e($jobs->firstItem()); ?>–<?php echo e($jobs->lastItem()); ?></span>
    <div class="flex gap-1">
      <?php if($jobs->onFirstPage()): ?>
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">이전</span>
      <?php else: ?>
        <a href="<?php echo e($jobs->previousPageUrl()); ?>" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">이전</a>
      <?php endif; ?>
      <?php $__currentLoopData = $jobs->getUrlRange(max(1, $jobs->currentPage()-2), min($jobs->lastPage(), $jobs->currentPage()+2)); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $page => $url): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <a href="<?php echo e($url); ?>"
           class="px-2.5 py-1 text-xs rounded border transition-colors
                  <?php echo e($page == $jobs->currentPage() ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'); ?>">
          <?php echo e($page); ?>

        </a>
      <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
      <?php if($jobs->hasMorePages()): ?>
        <a href="<?php echo e($jobs->nextPageUrl()); ?>" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">다음</a>
      <?php else: ?>
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">다음</span>
      <?php endif; ?>
    </div>
  </div>
  <?php endif; ?>
</div>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.admin', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Users/leewonyuep/gada-vn/apps/admin-laravel/resources/views/admin/jobs/index.blade.php ENDPATH**/ ?>