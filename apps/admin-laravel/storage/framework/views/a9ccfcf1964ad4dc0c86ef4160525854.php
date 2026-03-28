<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>GADA Admin — 로그인</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>body { font-family: 'Inter', sans-serif; }</style>
</head>
<body class="min-h-screen bg-slate-900 flex items-center justify-center">
  <div class="w-full max-w-sm px-4">
    <div class="text-center mb-8">
      <span class="text-blue-400 font-black text-3xl tracking-tight">GADA</span>
      <p class="text-slate-400 text-sm mt-1">관리자 대시보드</p>
    </div>
    <div class="bg-white rounded-lg shadow-xl p-8">
      <h2 class="text-gray-900 font-semibold text-lg mb-6">로그인</h2>

      <?php if(session('success')): ?>
        <div class="bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded mb-4">
          <?php echo e(session('success')); ?>

        </div>
      <?php endif; ?>

      <?php if($errors->any()): ?>
        <div class="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded mb-4">
          <?php echo e($errors->first()); ?>

        </div>
      <?php endif; ?>

      <form method="POST" action="/admin/login">
        <?php echo csrf_field(); ?>
        <div class="mb-4">
          <label class="block text-xs font-medium text-gray-700 mb-1">이메일</label>
          <input type="email" name="email" value="<?php echo e(old('email')); ?>" required autocomplete="email"
                 class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 <?php $__errorArgs = ['email'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?> border-red-400 <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>">
          <?php $__errorArgs = ['email'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
            <p class="text-red-500 text-xs mt-1"><?php echo e($message); ?></p>
          <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
        </div>
        <div class="mb-6">
          <label class="block text-xs font-medium text-gray-700 mb-1">비밀번호</label>
          <input type="password" name="password" required autocomplete="current-password"
                 class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 <?php $__errorArgs = ['password'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?> border-red-400 <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>">
          <?php $__errorArgs = ['password'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
            <p class="text-red-500 text-xs mt-1"><?php echo e($message); ?></p>
          <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
        </div>
        <button type="submit"
                class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded transition-colors text-sm">
          로그인
        </button>
      </form>
    </div>
    <p class="text-center text-slate-600 text-xs mt-6">GADA VN Admin Panel &copy; <?php echo e(date('Y')); ?></p>
  </div>
</body>
</html>
<?php /**PATH /Users/leewonyuep/gada-vn/apps/admin-laravel/resources/views/admin/login.blade.php ENDPATH**/ ?>