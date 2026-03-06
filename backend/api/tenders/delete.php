<?php
/**
 * DELETE /api/tenders/delete — Admin delete draft tender only.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid tender ID', 400);
}

$stmt = $pdo->prepare("SELECT id, status, title FROM tenders WHERE id = ?");
$stmt->execute([$id]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}
if ($tender['status'] !== 'draft') {
    jsonError('Only draft tenders can be deleted', 400);
}

$stmt = $pdo->prepare("DELETE FROM tenders WHERE id = ?");
$stmt->execute([$id]);
auditLog($pdo, $user['user_id'], 'tender_deleted', 'tenders', $id, $tender['title']);
jsonSuccess(['message' => 'Tender deleted']);