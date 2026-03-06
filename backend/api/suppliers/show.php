<?php
/**
 * GET /api/suppliers/show?id=1 — Single supplier (admin) or own profile (supplier).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0 && $user['role'] === 'supplier') {
    $id = $user['user_id'];
}
if ($id <= 0) {
    jsonError('Invalid supplier ID', 400);
}

if ($user['role'] === 'supplier' && $id !== $user['user_id']) {
    jsonError('Forbidden', 403);
}
if ($user['role'] !== 'admin' && $user['role'] !== 'supplier') {
    jsonError('Forbidden', 403);
}

$stmt = $pdo->prepare("SELECT id, name, email, status, created_at FROM users WHERE id = ? AND role = 'supplier'");
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    jsonError('Supplier not found', 404);
}

$stmt = $pdo->prepare("SELECT * FROM supplier_profiles WHERE user_id = ?");
$stmt->execute([$id]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);
$row['profile'] = $profile;

$stmt = $pdo->prepare("SELECT AVG(overall_score) AS average_overall, COUNT(*) AS total_contracts_rated FROM supplier_ratings WHERE supplier_id = ?");
$stmt->execute([$id]);
$ratingRow = $stmt->fetch(PDO::FETCH_ASSOC);
$row['rating_summary'] = [
    'average_overall' => $ratingRow && $ratingRow['total_contracts_rated'] > 0
        ? round((float) $ratingRow['average_overall'], 2)
        : null,
    'total_contracts_rated' => (int) ($ratingRow['total_contracts_rated'] ?? 0),
];

$row['id'] = (int) $row['id'];
jsonSuccess($row);