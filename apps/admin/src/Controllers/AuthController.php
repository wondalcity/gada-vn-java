<?php
declare(strict_types=1);

namespace GadaAdmin\Controllers;

use GadaAdmin\Services\AuthService;

class AuthController extends BaseController
{
    public function login(): void
    {
        if (!empty($_SESSION['admin_authenticated'])) {
            $this->redirect('/');
            return;
        }

        $error = null;

        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $this->verifyCsrf();
            $username = trim($_POST['username'] ?? '');
            $password = $_POST['password'] ?? '';

            $authService = new AuthService();
            if ($authService->attempt($username, $password)) {
                $this->redirect('/');
                return;
            }
            $error = '아이디 또는 비밀번호가 올바르지 않습니다.';
        }

        $this->render('auth/login.twig', ['error' => $error]);
    }

    public function logout(): void
    {
        $authService = new AuthService();
        $authService->logout();
        $this->redirect('/login');
    }
}
