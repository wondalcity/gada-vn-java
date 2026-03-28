<?php

namespace App\Policies;

use App\Models\Site;
use App\Models\User;

class SitePolicy
{
    public function view(User $user, Site $site): bool
    {
        return $user->isAdmin() || $site->manager_user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return $user->isManager();
    }

    public function update(User $user, Site $site): bool
    {
        return $user->isManager() && $site->manager_user_id === $user->id;
    }

    public function updateStatus(User $user, Site $site): bool
    {
        return ($user->isManager() && $site->manager_user_id === $user->id)
            || $user->isAdmin();
    }

    public function deactivate(User $user): bool
    {
        return $user->isAdmin();
    }
}
