<?php

namespace App\Support;

class FrontendUrl
{
    /** Base URL of the Next.js frontend, e.g. https://rlci.ridnovir.in.ua */
    public static function base(): string
    {
        $configured = (string) env('FRONTEND_URL', '');
        if ($configured !== '') {
            return rtrim($configured, '/');
        }

        // APP_URL points to the API gateway (https://host/api); the frontend lives on the same host.
        $appUrl = rtrim((string) config('app.url'), '/');

        return preg_replace('#/api$#', '', $appUrl) ?: $appUrl;
    }

    public static function to(string $path): string
    {
        return self::base().'/'.ltrim($path, '/');
    }
}
