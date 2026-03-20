<?php
declare(strict_types=1);

namespace GadaAdmin\Controllers;

class ManagerController extends BaseController
{
    public function index(): void
    {
        $status = $_GET['status'] ?? 'PENDING';
        $page = (int)($_GET['page'] ?? 1);

        $managers = $this->api->get('/admin/managers', [
            'status' => $status,
            'page' => $page,
            'limit' => 20,
        ]);

        $this->render('managers/index.twig', [
            'managers' => $managers,
            'current_status' => $status,
            'page' => $page,
            'page_title' => '관리자 승인',
        ]);
    }

    public function show(string $id): void
    {
        $manager = $this->api->get('/admin/managers/' . $id);

        $this->render('managers/show.twig', [
            'manager' => $manager,
            'page_title' => '관리자 상세',
        ]);
    }

    public function approve(string $id): void
    {
        $this->requirePost();
        $this->verifyCsrf();

        $this->api->post('/admin/managers/' . $id . '/approve');
        $this->redirect('/managers?status=PENDING&flash=approved');
    }

    public function reject(string $id): void
    {
        $this->requirePost();
        $this->verifyCsrf();

        $reason = trim($_POST['reason'] ?? '');
        $this->api->post('/admin/managers/' . $id . '/reject', ['reason' => $reason]);
        $this->redirect('/managers?status=PENDING&flash=rejected');
    }
}
