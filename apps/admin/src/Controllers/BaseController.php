<?php
declare(strict_types=1);

namespace GadaAdmin\Controllers;

use Twig\Environment;
use Twig\Loader\FilesystemLoader;
use GadaAdmin\Services\ApiService;
use GadaAdmin\Services\AuthService;

abstract class BaseController
{
    protected Environment $twig;
    protected ApiService $api;

    public function __construct()
    {
        $loader = new FilesystemLoader(ROOT_PATH . '/src/Views');
        $this->twig = new Environment($loader, [
            'cache' => false, // Enable in production: ROOT_PATH . '/cache/twig'
            'debug' => ($_ENV['APP_ENV'] ?? 'production') === 'development',
        ]);

        // Global template vars
        $this->twig->addGlobal('csrf_token', AuthService::generateCsrf());
        $this->twig->addGlobal('current_path', parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
        $this->twig->addGlobal('admin_username', $_SESSION['admin_username'] ?? '');

        $this->api = new ApiService();
    }

    protected function render(string $template, array $data = []): void
    {
        echo $this->twig->render($template, $data);
    }

    protected function redirect(string $path): void
    {
        header('Location: ' . $path);
        exit;
    }

    protected function requirePost(): void
    {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            exit;
        }
    }

    protected function verifyCsrf(): void
    {
        $token = $_POST['csrf_token'] ?? '';
        if (!AuthService::verifyCsrf($token)) {
            http_response_code(403);
            echo 'Invalid CSRF token';
            exit;
        }
    }
}
