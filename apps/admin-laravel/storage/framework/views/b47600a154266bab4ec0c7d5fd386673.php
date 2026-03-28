<?php $__env->startSection('title', '승인 상세 | GADA Admin'); ?>
<?php $__env->startSection('page-title', '매니저 승인 상세'); ?>

<?php $__env->startSection('content'); ?>


<div class="flex items-center justify-between mb-4">
  <a href="/admin/approvals" class="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors">
    ← 목록으로
  </a>
  <div class="flex items-center gap-2">
    <?php
      $statusConfig = [
        'PENDING'  => ['label' => '검토 대기중', 'class' => 'bg-amber-100 text-amber-700 border-amber-200'],
        'APPROVED' => ['label' => '승인됨',      'class' => 'bg-green-100 text-green-700 border-green-200'],
        'REJECTED' => ['label' => '반려됨',      'class' => 'bg-red-100 text-red-700 border-red-200'],
      ];
      $sc = $statusConfig[$profile->approval_status] ?? ['label' => $profile->approval_status, 'class' => 'bg-gray-100 text-gray-600 border-gray-200'];
    ?>
    <span class="px-2.5 py-1 rounded-full text-xs font-semibold border <?php echo e($sc['class']); ?>"><?php echo e($sc['label']); ?></span>
  </div>
</div>


<div class="bg-white rounded-lg border border-gray-200 p-5 mb-4">
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-lg font-bold text-gray-900"><?php echo e($profile->representative_name ?? '이름 없음'); ?></h2>
      <p class="text-sm text-gray-500 mt-0.5"><?php echo e($profile->email); ?></p>
      <div class="flex items-center gap-2 mt-2 flex-wrap">
        <span class="px-2 py-0.5 rounded text-xs font-medium
          <?php echo e($profile->business_type === 'CORPORATE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'); ?>">
          <?php echo e($profile->business_type === 'CORPORATE' ? '법인사업자' : '개인사업자'); ?>

        </span>
        <?php if($profile->company_name): ?>
          <span class="text-xs text-gray-500"><?php echo e($profile->company_name); ?></span>
        <?php endif; ?>
        <?php if($profile->province): ?>
          <span class="text-xs text-gray-400">📍 <?php echo e($profile->province); ?></span>
        <?php endif; ?>
      </div>
    </div>
    <div class="text-right text-xs text-gray-400 shrink-0">
      <p>신청일: <?php echo e(\Carbon\Carbon::parse($profile->created_at)->format('Y-m-d H:i')); ?></p>
      <p class="mt-0.5"><?php echo e(\Carbon\Carbon::parse($profile->created_at)->diffForHumans()); ?></p>
      <?php if($profile->user_created_at): ?>
        <p class="mt-1">가입일: <?php echo e(\Carbon\Carbon::parse($profile->user_created_at)->format('Y-m-d')); ?></p>
      <?php endif; ?>
    </div>
  </div>
</div>


<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

  
  <div class="bg-white rounded-lg border border-gray-200 p-5">
    <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">사업자 정보</h3>
    <dl class="space-y-2.5">
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">사업자 유형</dt>
        <dd class="text-xs text-gray-700 font-medium">
          <?php echo e($profile->business_type === 'CORPORATE' ? '법인사업자' : '개인사업자'); ?>

        </dd>
      </div>
      <?php if($profile->company_name): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">상호명</dt>
        <dd class="text-xs text-gray-700"><?php echo e($profile->company_name); ?></dd>
      </div>
      <?php endif; ?>
      <?php if($profile->business_reg_number): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">사업자번호</dt>
        <dd class="text-xs text-gray-700 font-mono"><?php echo e($profile->business_reg_number); ?></dd>
      </div>
      <?php endif; ?>
      <?php if($profile->contact_phone): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">연락처</dt>
        <dd class="text-xs text-gray-700"><?php echo e($profile->contact_phone); ?></dd>
      </div>
      <?php endif; ?>
      <?php if($profile->contact_address): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">사업장 주소</dt>
        <dd class="text-xs text-gray-700"><?php echo e($profile->contact_address); ?></dd>
      </div>
      <?php endif; ?>
      <?php if($profile->province): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">지역</dt>
        <dd class="text-xs text-gray-700"><?php echo e($profile->province); ?></dd>
      </div>
      <?php endif; ?>
      <?php if($profile->first_site_name): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">첫 번째 현장</dt>
        <dd class="text-xs text-gray-700"><?php echo e($profile->first_site_name); ?></dd>
      </div>
      <?php endif; ?>
      <?php if($profile->first_site_address): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">현장 주소</dt>
        <dd class="text-xs text-gray-700"><?php echo e($profile->first_site_address); ?></dd>
      </div>
      <?php endif; ?>
    </dl>
  </div>

  
  <div class="bg-white rounded-lg border border-gray-200 p-5">
    <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">대표자 정보</h3>
    <dl class="space-y-2.5">
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">대표자명</dt>
        <dd class="text-xs text-gray-700 font-medium"><?php echo e($profile->representative_name ?? '—'); ?></dd>
      </div>
      <?php if($profile->representative_dob): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">생년월일</dt>
        <dd class="text-xs text-gray-700"><?php echo e(\Carbon\Carbon::parse($profile->representative_dob)->format('Y년 m월 d일')); ?></dd>
      </div>
      <?php endif; ?>
      <?php if($profile->representative_gender): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">성별</dt>
        <dd class="text-xs text-gray-700">
          <?php echo e($profile->representative_gender === 'MALE' ? '남성' : ($profile->representative_gender === 'FEMALE' ? '여성' : $profile->representative_gender)); ?>

        </dd>
      </div>
      <?php endif; ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">이메일</dt>
        <dd class="text-xs text-gray-700"><?php echo e($profile->email); ?></dd>
      </div>
      <?php if($profile->user_phone): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">전화번호</dt>
        <dd class="text-xs text-gray-700"><?php echo e($profile->user_phone); ?></dd>
      </div>
      <?php endif; ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">약관 동의</dt>
        <dd class="text-xs text-gray-700">
          <?php if($profile->terms_accepted && $profile->privacy_accepted): ?>
            <span class="text-green-600 font-medium">✓ 이용약관 + 개인정보처리방침</span>
          <?php else: ?>
            <span class="text-red-500">미동의</span>
          <?php endif; ?>
        </dd>
      </div>
    </dl>
  </div>
</div>


<?php if($businessRegUrl || $signatureUrl): ?>
<div class="bg-white rounded-lg border border-gray-200 p-5 mb-4">
  <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">첨부 서류</h3>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <?php if($businessRegUrl): ?>
    <div>
      <p class="text-xs font-medium text-gray-600 mb-2">사업자등록증</p>
      <a href="<?php echo e($businessRegUrl); ?>" target="_blank" rel="noopener"
         class="block border border-gray-200 rounded overflow-hidden hover:border-blue-300 transition-colors">
        <img src="<?php echo e($businessRegUrl); ?>" alt="사업자등록증" class="w-full h-48 object-contain bg-gray-50"
             onerror="this.parentElement.innerHTML='<div class=\'p-6 text-center text-xs text-gray-400 bg-gray-50\'>이미지를 불러올 수 없습니다.<br><a href=\'<?php echo e($businessRegUrl); ?>\' target=\'_blank\' class=\'text-blue-600 underline mt-1 block\'>직접 보기 →</a></div>'">
        <p class="text-xs text-gray-400 px-3 py-2 bg-gray-50 border-t border-gray-100">새 탭에서 열기 →</p>
      </a>
    </div>
    <?php else: ?>
    <div>
      <p class="text-xs font-medium text-gray-600 mb-2">사업자등록증</p>
      <div class="border border-gray-200 rounded p-6 text-center text-xs text-gray-400 bg-gray-50">
        파일 없음
      </div>
    </div>
    <?php endif; ?>

    <?php if($signatureUrl): ?>
    <div>
      <p class="text-xs font-medium text-gray-600 mb-2">서명</p>
      <a href="<?php echo e($signatureUrl); ?>" target="_blank" rel="noopener"
         class="block border border-gray-200 rounded overflow-hidden hover:border-blue-300 transition-colors">
        <img src="<?php echo e($signatureUrl); ?>" alt="서명" class="w-full h-48 object-contain bg-gray-50"
             onerror="this.parentElement.innerHTML='<div class=\'p-6 text-center text-xs text-gray-400 bg-gray-50\'>이미지를 불러올 수 없습니다.</div>'">
        <p class="text-xs text-gray-400 px-3 py-2 bg-gray-50 border-t border-gray-100">새 탭에서 열기 →</p>
      </a>
    </div>
    <?php else: ?>
    <div>
      <p class="text-xs font-medium text-gray-600 mb-2">서명</p>
      <div class="border border-gray-200 rounded p-6 text-center text-xs text-gray-400 bg-gray-50">
        파일 없음
      </div>
    </div>
    <?php endif; ?>
  </div>
</div>
<?php endif; ?>


<?php if($sites->isNotEmpty()): ?>
<div class="bg-white rounded-lg border border-gray-200 p-5 mb-4">
  <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">
    등록된 현장
    <span class="text-gray-400 font-normal">(<?php echo e($sites->count()); ?>개)</span>
  </h3>
  <div class="space-y-2">
    <?php $__currentLoopData = $sites; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $site): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <div class="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <a href="/admin/sites/<?php echo e($site->id); ?>" class="text-xs font-medium text-gray-900 hover:text-blue-600 transition-colors">
          <?php echo e($site->name); ?>

        </a>
        <p class="text-xs text-gray-400"><?php echo e($site->address); ?></p>
      </div>
      <div class="text-right">
        <span class="text-xs px-1.5 py-0.5 rounded font-medium
          <?php echo e($site->status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'); ?>">
          <?php echo e($site->status === 'ACTIVE' ? '활성' : '비활성'); ?>

        </span>
        <p class="text-xs text-gray-400 mt-0.5"><?php echo e(\Carbon\Carbon::parse($site->created_at)->format('Y-m-d')); ?></p>
      </div>
    </div>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </div>
</div>
<?php endif; ?>


<div class="bg-white rounded-lg border border-gray-200 p-5 mb-4">
  <h3 class="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-100">검토 이력</h3>

  <?php if($profile->approval_status !== 'PENDING'): ?>
    <dl class="space-y-2.5">
      <?php if($profile->approved_at): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">처리일시</dt>
        <dd class="text-xs text-gray-700"><?php echo e(\Carbon\Carbon::parse($profile->approved_at)->format('Y-m-d H:i')); ?></dd>
      </div>
      <?php endif; ?>
      <?php if($profile->reviewer_email): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">처리 관리자</dt>
        <dd class="text-xs text-gray-700"><?php echo e($profile->reviewer_email); ?></dd>
      </div>
      <?php endif; ?>
      <?php if($profile->rejection_reason): ?>
      <div class="flex gap-3">
        <dt class="text-xs text-gray-400 w-28 shrink-0">반려 사유</dt>
        <dd class="text-xs text-red-600 bg-red-50 rounded px-2 py-1.5 flex-1"><?php echo e($profile->rejection_reason); ?></dd>
      </div>
      <?php endif; ?>
    </dl>
  <?php else: ?>
    <p class="text-xs text-gray-400">아직 처리되지 않은 신청입니다.</p>
  <?php endif; ?>
</div>


<?php if($profile->approval_status === 'PENDING'): ?>
<div class="bg-white rounded-lg border border-gray-200 p-5">
  <h3 class="text-sm font-semibold text-gray-900 mb-4">처리</h3>
  <div class="flex flex-col sm:flex-row gap-3">
    
    <form method="POST" action="/admin/approvals/<?php echo e($profile->id); ?>/approve" class="inline">
      <?php echo csrf_field(); ?>
      <button type="submit"
              onclick="return confirm('<?php echo e($profile->representative_name ?? $profile->email); ?> 을(를) 승인하시겠습니까?\n매니저 권한이 즉시 부여됩니다.')"
              class="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded transition-colors text-sm">
        ✓ 승인하기
      </button>
    </form>

    
    <button onclick="document.getElementById('reject-section').classList.toggle('hidden')"
            class="w-full sm:w-auto bg-red-100 hover:bg-red-200 text-red-700 font-semibold py-2 px-6 rounded transition-colors text-sm">
      ✕ 반려하기
    </button>
  </div>

  
  <div id="reject-section" class="hidden mt-4 pt-4 border-t border-gray-100">
    <form method="POST" action="/admin/approvals/<?php echo e($profile->id); ?>/reject">
      <?php echo csrf_field(); ?>
      <div class="mb-3">
        <label class="block text-xs font-medium text-gray-700 mb-1">
          반려 사유 <span class="text-red-500">*</span>
        </label>
        <textarea name="reason" required minlength="5" maxlength="500" rows="3"
                  class="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none max-w-lg"
                  placeholder="신청자에게 전달될 반려 사유를 입력하세요 (최소 5자)"></textarea>
        <?php $__errorArgs = ['reason'];
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
              class="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded transition-colors text-sm">
        반려 처리 확정
      </button>
    </form>
  </div>
</div>
<?php endif; ?>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.admin', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /Users/leewonyuep/gada-vn/apps/admin-laravel/resources/views/admin/approvals/show.blade.php ENDPATH**/ ?>