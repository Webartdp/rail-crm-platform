<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Answers in the UI language sent by the frontend (Accept-Language: de | ru). Default: German. */
class SetLocale
{
    public const SUPPORTED = ['de', 'ru'];

    public function handle(Request $request, Closure $next): Response
    {
        $header = strtolower((string) $request->header('Accept-Language', ''));
        $locale = 'de';

        foreach (explode(',', $header) as $part) {
            $code = substr(trim($part), 0, 2);
            if (in_array($code, self::SUPPORTED, true)) {
                $locale = $code;
                break;
            }
        }

        app()->setLocale($locale);

        $response = $next($request);
        $response->headers->set('Content-Language', $locale);

        return $response;
    }
}
