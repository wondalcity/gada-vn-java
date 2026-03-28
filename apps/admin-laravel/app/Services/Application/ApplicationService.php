<?php

namespace App\Services\Application;

use App\Models\Application;
use App\Models\Job;
use App\Models\WorkerProfile;
use App\Models\ManagerProfile;
use Illuminate\Support\Facades\DB;

class ApplicationService
{
    /**
     * Worker applies for a job.
     * Checks: job is OPEN, slots available, not duplicate.
     * Returns the created Application.
     */
    public function apply(string $jobId, string $workerProfileId): Application
    {
        return DB::transaction(function () use ($jobId, $workerProfileId) {
            $job = Job::lockForUpdate()->findOrFail($jobId);

            if ($job->status !== 'OPEN') {
                throw new \DomainException('JOB_NOT_OPEN');
            }
            if ($job->slots_filled >= $job->slots_total) {
                throw new \DomainException('JOB_FULL');
            }
            if ($job->expires_at && $job->expires_at->isPast()) {
                throw new \DomainException('JOB_EXPIRED');
            }

            // Duplicate check
            $existing = Application::where('job_id', $jobId)
                ->where('worker_id', $workerProfileId)
                ->whereNotIn('status', ['WITHDRAWN', 'REJECTED'])
                ->first();

            if ($existing) {
                throw new \DomainException('ALREADY_APPLIED');
            }

            return Application::create([
                'job_id'     => $jobId,
                'worker_id'  => $workerProfileId,
                'status'     => 'PENDING',
                'applied_at' => now(),
            ]);
        });
    }

    /**
     * Manager accepts an application.
     * Increments slots_filled. Auto-fills job when at capacity.
     */
    public function accept(Application $application, string $managerProfileId): void
    {
        DB::transaction(function () use ($application, $managerProfileId) {
            if (!in_array($application->status, ['PENDING'])) {
                throw new \DomainException('INVALID_STATUS_TRANSITION');
            }

            $job = Job::lockForUpdate()->findOrFail($application->job_id);

            if ($job->slots_filled >= $job->slots_total) {
                throw new \DomainException('JOB_FULL');
            }

            $application->update([
                'status'      => 'ACCEPTED',
                'reviewed_at' => now(),
                'reviewed_by' => $managerProfileId,
            ]);

            $newFilled = $job->slots_filled + 1;
            $newStatus = $newFilled >= $job->slots_total ? 'FILLED' : $job->status;

            $job->update([
                'slots_filled' => $newFilled,
                'status'       => $newStatus,
            ]);
        });
    }

    /**
     * Manager rejects an application.
     * If the application was ACCEPTED, decrements slots_filled and reopens FILLED jobs.
     */
    public function reject(Application $application, string $managerProfileId, ?string $notes = null): void
    {
        DB::transaction(function () use ($application, $managerProfileId, $notes) {
            $wasAccepted = $application->status === 'ACCEPTED';

            $application->update([
                'status'      => 'REJECTED',
                'reviewed_at' => now(),
                'reviewed_by' => $managerProfileId,
                'notes'       => $notes,
            ]);

            if ($wasAccepted) {
                $job = Job::lockForUpdate()->findOrFail($application->job_id);
                $newFilled = max(0, $job->slots_filled - 1);
                $newStatus = $job->status === 'FILLED' ? 'OPEN' : $job->status;
                $job->update(['slots_filled' => $newFilled, 'status' => $newStatus]);
            }
        });
    }

    /**
     * Worker withdraws their pending application.
     */
    public function withdraw(Application $application, string $workerProfileId): void
    {
        if ($application->worker_id !== $workerProfileId) {
            throw new \DomainException('UNAUTHORIZED');
        }
        if ($application->status !== 'PENDING') {
            throw new \DomainException('CANNOT_WITHDRAW');
        }
        $application->update(['status' => 'WITHDRAWN']);
    }

    /**
     * Manager bulk-accepts multiple applications in one transaction.
     * Validates total accepted won't exceed slots_total.
     */
    public function bulkAccept(Job $job, array $applicationIds, string $managerProfileId): array
    {
        return DB::transaction(function () use ($job, $applicationIds, $managerProfileId) {
            $job = Job::lockForUpdate()->findOrFail($job->id);

            $pending = Application::whereIn('id', $applicationIds)
                ->where('job_id', $job->id)
                ->where('status', 'PENDING')
                ->get();

            $availableSlots = $job->slots_total - $job->slots_filled;

            if ($pending->count() > $availableSlots) {
                throw new \DomainException('EXCEEDS_SLOTS');
            }

            $accepted = 0;
            foreach ($pending as $app) {
                $app->update([
                    'status'      => 'ACCEPTED',
                    'reviewed_at' => now(),
                    'reviewed_by' => $managerProfileId,
                ]);
                $accepted++;
            }

            $newFilled = $job->slots_filled + $accepted;
            $newStatus = $newFilled >= $job->slots_total ? 'FILLED' : $job->status;

            $job->update(['slots_filled' => $newFilled, 'status' => $newStatus]);

            return [
                'accepted'    => $accepted,
                'slotsFilled' => $newFilled,
                'slotsTotal'  => $job->slots_total,
                'jobStatus'   => $newStatus,
            ];
        });
    }
}
