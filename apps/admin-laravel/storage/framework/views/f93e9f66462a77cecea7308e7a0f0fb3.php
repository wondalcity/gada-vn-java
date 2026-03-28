<?php $__env->startSection('title', '사용자 관리 | GADA Admin'); ?>
<?php $__env->startSection('page-title', '사용자 관리'); ?>

<?php $__env->startSection('content'); ?>


<div class="bg-white rounded-lg border border-gray-200 mb-4 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
  
  <div class="flex gap-0.5">
    <?php $__currentLoopData = ['' => '전체', 'worker' => '근로자', 'manager' => '매니저', 'admin' => '관리자']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $roleVal => $roleLabel): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <a href="<?php echo e(request()->fullUrlWithQuery(['role' => $roleVal ?: null, 'page' => 1])); ?>"
       class="px-3 py-1.5 text-xs font-medium rounded transition-colors
              <?php echo e($role === $roleVal ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'); ?>">
      <?php echo e($roleLabel); ?>

    </a>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </div>

  
  <form method="GET" action="/admin/users" class="flex items-center gap-2">
    <?php if($role): ?>
      <input type="hidden" name="role" value="<?php echo e($role); ?>">
    <?php endif; ?>
    <input type="text" name="q" value="<?php echo e($search); ?>" placeholder="이름, 이메일, 전화번호 검색..."
           class="border border-gray-300 rounded px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-56">
    <button type="submit" class="bg-blue-600 text-white px-3 py-1.5 rounded text-xs hover:bg-blue-700 transition-colors font-medium">검색</button>
    <?php if($search): ?>
      <a href="<?php echo e(request()->fullUrlWithQuery(['q' => null])); ?>" class="text-xs text-gray-400 hover:text-gray-600">초기화</a>
    <?php endif; ?>
  </form>
</div>


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
        <?php $__empty_1 = true; $__currentLoopData = $users; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $user): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
        <?php
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
        ?>
        <tr class="hover:bg-gray-50 transition-colors">
          <td class="px-4 py-2.5">
            <a href="/admin/users/<?php echo e($user->id); ?>" class="font-medium text-gray-900 hover:text-blue-600 transition-colors block">
              <?php echo e($user->full_name ?? '이름 없음'); ?>

            </a>
            <span class="text-gray-400 truncate block max-w-[180px]"><?php echo e($user->email); ?></span>
          </td>
          <td class="px-4 py-2.5 text-gray-500"><?php echo e($user->phone ?? '—'); ?></td>
          <td class="px-4 py-2.5">
            <div class="flex gap-1 flex-wrap">
              <?php $__empty_2 = true; $__currentLoopData = $roles; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $r): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_2 = false; ?>
                <?php
                  $roleConfig = [
                    'worker'     => 'bg-gray-100 text-gray-600',
                    'manager'    => 'bg-blue-100 text-blue-700',
                    'admin'      => 'bg-purple-100 text-purple-700',
                    'super_admin'=> 'bg-red-100 text-red-700',
                  ];
                  $rc = $roleConfig[$r] ?? 'bg-gray-100 text-gray-500';
                ?>
                <span class="px-1.5 py-0.5 rounded text-xs font-medium <?php echo e($rc); ?>"><?php echo e($r); ?></span>
              <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_2): ?>
                <span class="text-gray-300">—</span>
              <?php endif; ?>
            </div>
          </td>
          <td class="px-4 py-2.5">
            <?php if($user->profile_complete): ?>
              <span class="text-green-600 text-xs font-medium">✓ 완성</span>
            <?php else: ?>
              <span class="text-gray-400 text-xs">미완성</span>
            <?php endif; ?>
          </td>
          <td class="px-4 py-2.5">
            <span class="px-1.5 py-0.5 rounded text-xs font-medium <?php echo e($sc['class']); ?>"><?php echo e($sc['label']); ?></span>
          </td>
          <td class="px-4 py-2.5 text-gray-400">
            <?php echo e(\Carbon\Carbon::parse($user->created_at)->format('Y-m-d')); ?>

          </td>
          <td class="px-4 py-2.5 text-right">
            <div class="flex items-center justify-end gap-1">
              <a href="/admin/users/<?php echo e($user->id); ?>"
                 class="text-blue-600 hover:text-blue-800 font-medium px-2 py-0.5 rounded hover:bg-blue-50 transition-colors">
                보기
              </a>
              <?php if($user->status === 'ACTIVE'): ?>
                <form method="POST" action="/admin/users/<?php echo e($user->id); ?>/suspend" class="inline">
                  <?php echo csrf_field(); ?>
                  <button type="submit"
                          onclick="return confirm('이 계정을 정지하시겠습니까?')"
                          class="bg-red-100 text-red-600 hover:bg-red-200 px-2 py-0.5 rounded font-medium transition-colors">
                    정지
                  </button>
                </form>
              <?php elseif($user->status === 'SUSPENDED'): ?>
                <form method="POST" action="/admin/users/<?php echo e($user->id); ?>/activate" class="inline">
                  <?php echo csrf_field(); ?>
                  <button type="submit"
                          class="bg-green-100 text-green-600 hover:bg-green-200 px-2 py-0.5 rounded font-medium transition-colors">
                    활성화
                  </button>
                </form>
              <?php endif; ?>
            </div>
          </td>
        </tr>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
        <tr>
          <td colspan="7" class="px-4 py-12 text-center text-sm text-gray-400">
            <?php echo e($search ? "'{$search}'에 대한 검색 결과가 없습니다." : '사용자가 없습니다.'); ?>

          </td>
        </tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>

  
  <?php if($users->hasPages()): ?>
  <div class="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
    <span class="text-xs text-gray-400">총 <?php echo e($users->total()); ?>명 중 <?php echo e($users->firstItem()); ?>–<?php echo e($users->lastItem()); ?></span>
    <div class="flex gap-1">
      <?php if($users->onFirstPage()): ?>
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">이전</span>
      <?php else: ?>
        <a href="<?php echo e($users->previousPageUrl()); ?>" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">이전</a>
      <?php endif; ?>
      <?php $__currentLoopData = $users->getUrlRange(max(1, $users->currentPage()-2), min($users->lastPage(), $users->currentPage()+2)); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $page => $url): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <a href="<?php echo e($url); ?>"
           class="px-2.5 py-1 text-xs rounded border transition-colors
                  <?php echo e($page == $users->currentPage() ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-300 hover:bg-gray-50'); ?>">
          <?php echo e($page); ?>

        </a>
      <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
      <?php if($users->hasMorePages()): ?>
        <a href="<?php echo e($users->nextPageUrl()); ?>" class="px-2.5 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">다음</a>
      <?php else: ?>
        <span class="px-2.5 py-1 text-xs text-gray-300 border border-gray-200 rounded cursor-not-allowed">다음</span>
      <?php endif; ?>
    </div>
  </div>
  <?php endif; ?>
</div>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.admin', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Users/leewonyuep/gada-vn/apps/admin-laravel/resources/views/admin/users/index.blade.php ENDPATH**/ ?>