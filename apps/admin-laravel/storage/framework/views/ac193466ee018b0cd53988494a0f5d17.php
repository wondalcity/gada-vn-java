<?php $__env->startSection('title', '감사 로그 | GADA Admin'); ?>
<?php $__env->startSection('page-title', '감사 로그'); ?>

<?php $__env->startSection('content'); ?>


<div class="bg-white rounded-lg border border-gray-200 mb-4 p-4">
  <form method="GET" action="/admin/audit-logs" class="flex flex-wrap items-end gap-3">
    
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">엔티티 유형</label>
      <select name="entity"
              class="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">전체</option>
        <?php $__currentLoopData = $entityTypes; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $et): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
          <option value="<?php echo e($et); ?>" <?php echo e($entityType === $et ? 'selected' : ''); ?>><?php echo e($et); ?></option>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
      </select>
    </div>

    
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">액션</label>
      <input type="text" name="action" value="<?php echo e($action); ?>" placeholder="액션명..."
             class="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-36">
    </div>

    
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">시작일</label>
      <input type="date" name="from" value="<?php echo e($dateFrom); ?>"
             class="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
    </div>
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">종료일</label>
      <input type="date" name="to" value="<?php echo e($dateTo); ?>"
             class="border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
    </div>

    
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-1">검색</label>
      <input type="text" name="q" value="<?php echo e($search); ?>" placeholder="이메일, 엔티티 ID..."
             class="border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-48">
    </div>

    <div class="flex items-center gap-2">
      <button type="submit" class="bg-blue-600 text-white px-4 py-1.5 rounded text-xs hover:bg-blue-700 transition-colors font-medium">
        적용
      </button>
      <?php if($search || $entityType || $action || $dateFrom || $dateTo): ?>
        <a href="/admin/audit-logs" class="text-xs text-gray-400 hover:text-gray-600 transition-colors">초기화</a>
      <?php endif; ?>
    </div>
  </form>
</div>


<div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
  <div class="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
    <span class="text-xs text-gray-500">총 <?php echo e($logs->total()); ?>건</span>
    <span class="text-xs text-gray-400">50개씩 표시</span>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full text-xs">
      <thead>
        <tr class="bg-gray-50 border-b border-gray-200 text-gray-500">
          <th class="px-4 py-2.5 text-left font-medium">시간</th>
          <th class="px-4 py-2.5 text-left font-medium">사용자</th>
          <th class="px-4 py-2.5 text-left font-medium">액션</th>
          <th class="px-4 py-2.5 text-left font-medium">엔티티 유형</th>
          <th class="px-4 py-2.5 text-left font-medium">엔티티 ID</th>
          <th class="px-4 py-2.5 text-left font-medium">IP</th>
          <th class="px-4 py-2.5 text-right font-medium">상세</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100">
        <?php $__empty_1 = true; $__currentLoopData = $logs; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $log): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
        <tr class="hover:bg-gray-50 transition-colors" id="log-<?php echo e($log->id); ?>">
          <td class="px-4 py-2.5 text-gray-400 whitespace-nowrap">
            <span title="<?php echo e($log->created_at); ?>">
              <?php echo e(\Carbon\Carbon::parse($log->created_at)->setTimezone('Asia/Ho_Chi_Minh')->format('m-d H:i:s')); ?>

            </span>
          </td>
          <td class="px-4 py-2.5">
            <?php if($log->user_email): ?>
              <span class="text-gray-700 truncate block max-w-[160px]"><?php echo e($log->user_email); ?></span>
            <?php else: ?>
              <span class="text-gray-300">시스템</span>
            <?php endif; ?>
          </td>
          <td class="px-4 py-2.5">
            <?php
              $actionColors = [
                'CREATE' => 'bg-green-100 text-green-700',
                'UPDATE' => 'bg-blue-100 text-blue-700',
                'DELETE' => 'bg-red-100 text-red-600',
                'APPROVE'=> 'bg-emerald-100 text-emerald-700',
                'REJECT' => 'bg-red-100 text-red-600',
                'LOGIN'  => 'bg-gray-100 text-gray-600',
                'LOGOUT' => 'bg-gray-100 text-gray-500',
              ];
              $actionWord = strtoupper(explode('_', $log->action)[0] ?? $log->action);
              $ac = $actionColors[$actionWord] ?? $actionColors[strtoupper($log->action)] ?? 'bg-gray-100 text-gray-500';
            ?>
            <span class="px-1.5 py-0.5 rounded font-medium <?php echo e($ac); ?>"><?php echo e($log->action); ?></span>
          </td>
          <td class="px-4 py-2.5 text-gray-500 font-mono"><?php echo e($log->entity_type ?? '—'); ?></td>
          <td class="px-4 py-2.5 text-gray-400 font-mono truncate max-w-[100px]" title="<?php echo e($log->entity_id); ?>">
            <?php echo e($log->entity_id ? substr($log->entity_id, 0, 12) . (strlen($log->entity_id) > 12 ? '…' : '') : '—'); ?>

          </td>
          <td class="px-4 py-2.5 text-gray-400 font-mono"><?php echo e($log->ip_address ?? '—'); ?></td>
          <td class="px-4 py-2.5 text-right">
            <?php if($log->old_values || $log->new_values): ?>
            <button onclick="toggleDiff('<?php echo e($log->id); ?>')"
                    class="text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
              diff
            </button>
            <?php endif; ?>
          </td>
        </tr>
        
        <?php if($log->old_values || $log->new_values): ?>
        <tr id="diff-<?php echo e($log->id); ?>" class="hidden bg-slate-50">
          <td colspan="7" class="px-4 py-3">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <?php if($log->old_values): ?>
              <div>
                <p class="text-xs font-semibold text-red-600 mb-1">이전 값 (old)</p>
                <pre class="text-xs text-gray-600 bg-red-50 border border-red-100 rounded p-2.5 overflow-x-auto whitespace-pre-wrap break-all max-h-48"><?php echo e(is_string($log->old_values) ? json_encode(json_decode($log->old_values), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) : json_encode($log->old_values, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)); ?></pre>
              </div>
              <?php endif; ?>
              <?php if($log->new_values): ?>
              <div>
                <p class="text-xs font-semibold text-green-600 mb-1">변경 값 (new)</p>
                <pre class="text-xs text-gray-600 bg-green-50 border border-green-100 rounded p-2.5 overflow-x-auto whitespace-pre-wrap break-all max-h-48"><?php echo e(is_string($log->new_values) ? json_encode(json_decode($log->new_values), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) : json_encode($log->new_values, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)); ?></pre>
              </div>
              <?php endif; ?>
            </div>
          </td>
        </tr>
        <?php endif; ?>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
        <tr>
          <td colspan="7" class="px-4 py-12 text-center text-sm text-gray-400">
            로그가 없습니다.
          </td>
        </tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>

  
  <?php if($logs->hasPages()): ?>
  <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
    <span class="text-xs text-gray-400">총 <?php echo e($logs->total()); ?>건 중 <?php echo e($logs->firstItem()); ?>–<?php echo e($logs->lastItem()); ?></span>
    <div class="flex gap-1">
      <?php if($logs->onFirstPage()): ?>
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">이전</span>
      <?php else: ?>
        <a href="<?php echo e($logs->previousPageUrl()); ?>" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">이전</a>
      <?php endif; ?>
      <?php $__currentLoopData = $logs->getUrlRange(max(1, $logs->currentPage()-2), min($logs->lastPage(), $logs->currentPage()+2)); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $page => $url): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <a href="<?php echo e($url); ?>"
           class="px-2.5 py-1 text-xs rounded border transition-colors
                  <?php echo e($page == $logs->currentPage() ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'); ?>">
          <?php echo e($page); ?>

        </a>
      <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
      <?php if($logs->hasMorePages()): ?>
        <a href="<?php echo e($logs->nextPageUrl()); ?>" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">다음</a>
      <?php else: ?>
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">다음</span>
      <?php endif; ?>
    </div>
  </div>
  <?php endif; ?>
</div>

<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
<script>
function toggleDiff(id) {
  const row = document.getElementById('diff-' + id);
  if (row) row.classList.toggle('hidden');
}
</script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make('layouts.admin', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Users/leewonyuep/gada-vn/apps/admin-laravel/resources/views/admin/audit/index.blade.php ENDPATH**/ ?>