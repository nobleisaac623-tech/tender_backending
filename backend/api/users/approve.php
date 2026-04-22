<?php
/**
 * POST /api/users/approve — Approve a user (admin only).
 * Body: { "user_id": 123 }
 *
 * For this request we use it mainly for evaluators:
 * pending -> active (approved)
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$admin = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$userId = (int) ($body['user_id'] ?? 0);
if ($userId <= 0) {
    jsonError('user_id is required', 400);
}

$stmt = $pdo->prepare("SELECT id, role, status, email FROM users WHERE id = ?");
$stmt->execute([$userId]);
$u = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$u) {
    jsonError('User not found', 404);
}

if (($u['status'] ?? '') === 'active') {
    jsonSuccess(['message' => 'Already approved']);
}

$stmt = $pdo->prepare("UPDATE users SET status = 'active' WHERE id = ?");
$stmt->execute([$userId]);

auditLog($pdo, (int) $admin['user_id'], 'user_approved', 'users', $userId, (string) ($u['email'] ?? ''));

jsonSuccess(['message' => 'Approved']);

