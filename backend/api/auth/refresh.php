<?php
/**
 * POST /api/auth/refresh — Refresh JWT (issue new token if current valid).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/jwt.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();

// Optional: check blacklist for current token
$token = jwtFromRequest();
if ($token) {
    $pdo = $GLOBALS['pdo'];
    $hash = hash('sha256', $token);
    $stmt = $pdo->prepare("SELECT 1 FROM token_blacklist WHERE token_hash = ? AND expires_at > NOW()");
    $stmt->execute([$hash]);
    if ($stmt->fetch()) {
        jsonError('Token has been revoked', 401);
    }
}

$payload = [
    'user_id' => $user['user_id'],
    'role' => $user['role'],
    'name' => $user['name'],
    'email' => $user['email'] ?? '',
];
$newToken = jwtEncode($payload);
jwtSetCookie($newToken);

jsonSuccess(['token' => $newToken, 'user' => $user]);