<?php
declare(strict_types=1);

namespace GadaAdmin\Controllers;

class WorkerController extends BaseController
{
    public function index(): void
    {
        $page = (int)($_GET['page'] ?? 1);
        $search = $_GET['search'] ?? '';

        $workers = $this->api->get('/admin/workers', [
            'page' => $page,
            'limit' => 20,
            'search' => $search,
        ]);

        $this->render('workers/index.twig', [
            'workers' => $workers,
            'page' => $page,
            'search' => $search,
            'page_title' => '근로자 관리',
        ]);
    }

    public function show(string $id): void
    {
        $worker = $this->api->get('/admin/workers/' . $id);

        $this->render('workers/show.twig', [
            'worker' => $worker,
            'page_title' => '근로자 상세',
        ]);
    }
}
