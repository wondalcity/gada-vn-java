<?php

namespace App\Observers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Request;

class AuditLogObserver
{
    public function created(Model $model): void
    {
        $this->log('created', $model, null, $model->getAttributes());
    }

    public function updated(Model $model): void
    {
        $this->log('updated', $model, $model->getOriginal(), $model->getChanges());
    }

    public function deleted(Model $model): void
    {
        $this->log('deleted', $model, $model->getAttributes(), null);
    }

    private function log(string $action, Model $model, ?array $oldValues, ?array $newValues): void
    {
        DB::table('ops.audit_logs')->insert([
            'user_id'     => Request::user()?->id,
            'action'      => $action,
            'entity_type' => class_basename($model),
            'entity_id'   => $model->getKey(),
            'old_values'  => $oldValues ? json_encode($oldValues) : null,
            'new_values'  => $newValues ? json_encode($newValues) : null,
            'ip_address'  => Request::ip(),
            'created_at'  => now(),
        ]);
    }
}
