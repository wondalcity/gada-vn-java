<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocaleMiddleware
{
    private const SUPPORTED_LOCALES = ['ko', 'vi', 'en'];
    private const DEFAULT_LOCALE = 'ko';

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolveLocale($request);
        App::setLocale($locale);

        return $next($request);
    }

    private function resolveLocale(Request $request): string
    {
        // 1. ?locale= query param (public endpoints only)
        $queryLocale = $request->query('locale');
        if ($queryLocale && in_array($queryLocale, self::SUPPORTED_LOCALES)) {
            return $queryLocale;
        }

        // 2. Authenticated user's stored locale
        $user = $request->user();
        if ($user && in_array($user->locale, self::SUPPORTED_LOCALES)) {
            return $user->locale;
        }

        // 3. Accept-Language header
        $acceptLanguage = $request->getPreferredLanguage(self::SUPPORTED_LOCALES);
        if ($acceptLanguage) {
            return $acceptLanguage;
        }

        return self::DEFAULT_LOCALE;
    }
}
