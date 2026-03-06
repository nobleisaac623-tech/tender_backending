<?php
/**
 * CORS headers. Include at top of every API entry point.
 * In production (APP_ENV=production), only the exact FRONTEND_URL origin is allowed.
 */

declare(strict_types=1);

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = $_ENV['FRONTEND_URL'] ?? 'http://localhost:5173';
$isProduction = (!empty($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'production');

if ($origin !== '') {
    if ($isProduction) {
        if ($origin === $allowed) {
            header("Access-Control-Allow-Origin: $origin");
        }
    } elseif ($allowed === '*' || $origin === $allowed || $origin === 'http://localhost:5173' || strpos($allowed, $origin) !== false) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header("Access-Control-Allow-Origin: $allowed");
    }
} elseif ($allowed === '*') {
    header('Access-Control-Allow-Origin: *');
} else {
    header("Access-Control-Allow-Origin: $allowed");
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
