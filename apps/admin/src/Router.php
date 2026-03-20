<?php
declare(strict_types=1);

namespace GadaAdmin;

use GadaAdmin\Controllers\AuthController;
use GadaAdmin\Controllers\DashboardController;
use GadaAdmin\Controllers\ManagerController;
use GadaAdmin\Controllers\WorkerController;
use GadaAdmin\Controllers\JobController;

class Router
{
    private string $path;
    private string $method;

    public function __construct()
    {
        $this->path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $this->method = $_SERVER['REQUEST_METHOD'];
    }

    public function dispatch(): void
    {
        // Auth routes (public)
        if ($this->path === '/login') {
            $this->run(AuthController::class, 'login');
            return;
        }
        if ($this->path === '/logout') {
            $this->run(AuthController::class, 'logout');
            return;
        }

        // Auth check for all other routes
        if (empty($_SESSION['admin_authenticated'])) {
            header('Location: /login');
            exit;
        }

        // Protected routes
        $matched = match(true) {
            $this->path === '/' || $this->path === '/dashboard'
                => $this->run(DashboardController::class, 'index'),

            $this->path === '/managers'
                => $this->run(ManagerController::class, 'index'),

            preg_match('#^/managers/(\w[\w-]*)$#', $this->path, $m) > 0
                => $this->run(ManagerController::class, 'show', ['id' => $m[1]]),

            preg_match('#^/managers/(\w[\w-]*)/approve$#', $this->path, $m) > 0
                => $this->run(ManagerController::class, 'approve', ['id' => $m[1]]),

            preg_match('#^/managers/(\w[\w-]*)/reject$#', $this->path, $m) > 0
                => $this->run(ManagerController::class, 'reject', ['id' => $m[1]]),

            $this->path === '/workers'
                => $this->run(WorkerController::class, 'index'),

            preg_match('#^/workers/(\w[\w-]*)$#', $this->path, $m) > 0
                => $this->run(WorkerController::class, 'show', ['id' => $m[1]]),

            $this->path === '/jobs'
                => $this->run(JobController::class, 'index'),

            preg_match('#^/jobs/(\w[\w-]*)$#', $this->path, $m) > 0
                => $this->run(JobController::class, 'show', ['id' => $m[1]]),

            default => $this->notFound(),
        };
    }

    private function run(string $controllerClass, string $action, array $params = []): void
    {
        $controller = new $controllerClass();
        $controller->$action(...array_values($params));
    }

    private function notFound(): void
    {
        http_response_code(404);
        echo '<h1>404 Not Found</h1>';
    }
}
