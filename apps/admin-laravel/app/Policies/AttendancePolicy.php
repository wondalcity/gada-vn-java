<?php

namespace App\Policies;

use App\Models\Job;
use App\Models\User;

class AttendancePolicy
{
    public function record(User $user, Job $job, string $date): bool
    {
        if ($user->isAdmin()) return true;

        $isOwnJob = $job->site->manager_user_id === $user->id;
        $isTodayOrFuture = $date >= now()->format('Y-m-d');

        return $user->isManager() && $isOwnJob && $isTodayOrFuture;
    }

    public function correctPast(User $user): bool
    {
        return $user->isAdmin();
    }
}
