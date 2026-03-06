<?php
/**
 * GET /api/auth/me — Current user info (requires auth).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$stmt = $pdo->prepare("SELECT id, name, email, role, status, created_at FROM users WHERE id = ?");
$stmt->execute([$user['user_id']]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    jsonError('User not found', 404);
}

$row['id'] = (int) $row['id'];

if ($row['role'] === 'supplier') {
    $stmt = $pdo->prepare("SELECT * FROM supplier_profiles WHERE user_id = ?");
    $stmt->execute([$row['id']]);
    $profile = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($profile) {
        unset($profile['user_id']);
        $row['supplier_profile'] = $profile;
    }
}

jsonSuccess($row);