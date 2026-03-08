<?php
/**
 * CORS headers for API.
 * Allows credentials with specific origins (not wildcard).
 */

declare(strict_types=1);

// Define allowed origins
$allowedOrigins = [
    'https://procurease.vercel.app',
    'https://vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
];

// Get the request origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Check if origin is allowed (supports *.vercel.app pattern)
$isAllowed = false;
$matchedOrigin = '';

if ($origin !== '') {
    // Check exact match first
    if (in_array($origin, $allowedOrigins, true)) {
        $isAllowed = true;
        $matchedOrigin = $origin;
    }
    // Check for Vercel preview deployments (*.vercel.app)
    elseif (preg_match('/^https:\/\/.+\.vercel\.app$/', $origin)) {
        $isAllowed = true;
        $matchedOrigin = $origin;
    }
}

// Set CORS headers only if origin is allowed
if ($isAllowed && $matchedOrigin !== '') {
    header("Access-Control-Allow-Origin: $matchedOrigin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
}

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
