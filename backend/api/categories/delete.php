<?php
/**
 * DELETE /api/categories/delete — Admin delete category (only if no tenders).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    jsonError('Method not allowed', 405);
}

requireAuth();
requireAdmin();

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid category ID', 400);
}

$pdo = $GLOBALS['pdo'];

$stmt = $pdo->prepare("SELECT COUNT(*) FROM tenders WHERE category_id = ?");
$stmt->execute([$id]);
$count = (int) $stmt->fetchColumn();
if ($count > 0) {
    jsonError('Cannot delete category: ' . $count . ' tender(s) are using it', 400);
}

$stmt = $pdo->prepare("DELETE FROM tender_categories WHERE id = ?");
$stmt->execute([$id]);
if ($stmt->rowCount() === 0) {
    jsonError('Category not found', 404);
}

jsonSuccess([]);
