<?php
/**
 * POST /api/auth/logout — Invalidate token and clear cookie.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/jwt.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$token = jwtFromRequest();
if ($token) {
    $pdo = $GLOBALS['pdo'];
    $hash = hash('sha256', $token);
    $payload = jwtDecode($token);
    $exp = $payload['exp'] ?? time();
    $stmt = $pdo->prepare("INSERT INTO token_blacklist (token_hash, expires_at) VALUES (?, FROM_UNIXTIME(?))");
    $stmt->execute([$hash, $exp]);
    $userId = $payload['user_id'] ?? null;
    if ($userId) {
        auditLog($pdo, (int) $userId, 'logout', 'users', (int) $userId, null);
    }
}
jwtClearCookie();
jsonSuccess(['message' => 'Logged out']);