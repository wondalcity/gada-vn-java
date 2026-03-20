<?php
declare(strict_types=1);

namespace GadaAdmin\Controllers;

class JobController extends BaseController
{
    public function index(): void
    {
        $page = (int)($_GET['page'] ?? 1);
        $status = $_GET['status'] ?? '';

        $jobs = $this->api->get('/jobs', [
            'page' => $page,
            'limit' => 20,
            'status' => $status,
        ]);

        $this->render('jobs/index.twig', [
            'jobs' => $jobs,
            'page' => $page,
            'current_status' => $status,
            'page_title' => '일자리 관리',
        ]);
    }

    public function show(string $id): void
    {
        $job = $this->api->get('/jobs/' . $id);

        $this->render('jobs/show.twig', [
            'job' => $job,
            'page_title' => '일자리 상세',
        ]);
    }
}
