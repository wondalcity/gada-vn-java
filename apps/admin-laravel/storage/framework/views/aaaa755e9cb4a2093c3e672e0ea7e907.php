<!DOCTYPE html>
<html lang="ko" class="h-full">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo $__env->yieldContent('title', 'GADA Admin'); ?></title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>body { font-family: 'Inter', sans-serif; }</style>
  <?php echo $__env->yieldPushContent('head'); ?>
</head>
<body class="h-full bg-gray-50 flex">

<!-- Sidebar -->
<aside class="w-56 bg-slate-900 flex flex-col shrink-0 fixed inset-y-0 left-0 z-30">
  <div class="px-4 py-4 border-b border-slate-700">
    <span class="text-blue-400 font-black text-lg tracking-tight">GADA</span>
    <span class="text-slate-400 text-xs ml-1">Admin</span>
  </div>
  <nav class="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
    <?php
      $path = request()->path();
      $pendingSidebarCount = \Illuminate\Support\Facades\DB::table('app.manager_profiles')
          ->where('approval_status', 'PENDING')
          ->count();
    ?>
    <?php $__currentLoopData = [
      ['icon'=>'📊','label'=>'대시보드','href'=>'/admin/','match'=>'admin'],
      ['icon'=>'✅','label'=>'승인 관리','href'=>'/admin/approvals','match'=>'admin/approvals'],
      ['icon'=>'👥','label'=>'사용자 관리','href'=>'/admin/users','match'=>'admin/users'],
      ['icon'=>'🏗️','label'=>'현장 관리','href'=>'/admin/sites','match'=>'admin/sites'],
      ['icon'=>'💼','label'=>'공고 관리','href'=>'/admin/jobs','match'=>'admin/jobs'],
      ['icon'=>'📋','label'=>'감사 로그','href'=>'/admin/audit-logs','match'=>'admin/audit-logs'],
    ]; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
      <?php
        $isActive = $item['match'] === 'admin'
          ? ($path === 'admin' || $path === 'admin/')
          : str_starts_with($path, $item['match']);
      ?>
      <a href="<?php echo e($item['href']); ?>"
         class="flex items-center gap-2.5 px-3 py-2 rounded text-sm font-medium transition-colors
                <?php echo e($isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'); ?>">
        <span class="text-base leading-none"><?php echo e($item['icon']); ?></span>
        <?php echo e($item['label']); ?>

        <?php if($item['match'] === 'admin/approvals' && $pendingSidebarCount > 0): ?>
          <span class="ml-auto bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full"><?php echo e($pendingSidebarCount); ?></span>
        <?php endif; ?>
      </a>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </nav>
  <div class="px-4 py-3 border-t border-slate-700">
    <p class="text-slate-400 text-xs truncate mb-2"><?php echo e(session('admin_email')); ?></p>
    <form method="POST" action="/admin/logout">
      <?php echo csrf_field(); ?>
      <button type="submit" class="text-slate-400 hover:text-white text-xs transition-colors">로그아웃 →</button>
    </form>
  </div>
</aside>

<!-- Main content -->
<div class="ml-56 flex-1 flex flex-col min-h-screen">
  <!-- Top bar -->
  <header class="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
    <h1 class="text-sm font-semibold text-gray-900"><?php echo $__env->yieldContent('page-title', 'Dashboard'); ?></h1>
    <span class="text-xs text-gray-400"><?php echo e(now()->setTimezone('Asia/Ho_Chi_Minh')->format('Y년 m월 d일 H:i')); ?></span>
  </header>

  <!-- Flash messages -->
  <?php if(session('success')): ?>
  <div id="flash-success" class="mx-6 mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded text-sm flex items-center justify-between">
    <span>✓ <?php echo e(session('success')); ?></span>
    <button onclick="document.getElementById('flash-success').remove()" class="ml-4 text-green-400 hover:text-green-600 font-bold">✕</button>
  </div>
  <?php endif; ?>
  <?php if(session('error') || $errors->any()): ?>
  <div id="flash-error" class="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm flex items-center justify-between">
    <span>✕ <?php echo e(session('error') ?? $errors->first()); ?></span>
    <button onclick="document.getElementById('flash-error').remove()" class="ml-4 text-red-400 hover:text-red-600 font-bold">✕</button>
  </div>
  <?php endif; ?>
  <?php if(session('warning')): ?>
  <div id="flash-warning" class="mx-6 mt-4 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2 rounded text-sm flex items-center justify-between">
    <span>⚠ <?php echo e(session('warning')); ?></span>
    <button onclick="document.getElementById('flash-warning').remove()" class="ml-4 text-yellow-400 hover:text-yellow-600 font-bold">✕</button>
  </div>
  <?php endif; ?>

  <main class="flex-1 p-6">
    <?php echo $__env->yieldContent('content'); ?>
  </main>
</div>

<script>
  setTimeout(() => {
    document.getElementById('flash-success')?.remove();
    document.getElementById('flash-error')?.remove();
    document.getElementById('flash-warning')?.remove();
  }, 4000);
</script>
<?php echo $__env->yieldPushContent('scripts'); ?>
</body>
</html>
<?php /**PATH /Users/leewonyuep/gada-vn/apps/admin-laravel/resources/views/layouts/admin.blade.php ENDPATH**/ ?>