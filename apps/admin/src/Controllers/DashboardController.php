<?php
declare(strict_types=1);

namespace GadaAdmin\Controllers;

class DashboardController extends BaseController
{
    public function index(): void
    {
        $managers = $this->api->get('/admin/managers', ['status' => 'PENDING', 'limit' => 5]);
        $stats = $this->api->get('/admin/stats');

        $this->render('dashboard/index.twig', [
            'pending_managers' => $managers,
            'stats' => $stats,
            'page_title' => '대시보드',
        ]);
    }
}
