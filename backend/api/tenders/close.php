<?php
/**
 * POST /api/tenders/close — Admin close tender.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();
$id = isset($body['id']) ? (int) $body['id'] : (isset($_GET['id']) ? (int) $_GET['id'] : 0);
if ($id <= 0) {
    jsonError('Invalid tender ID', 400);
}

$stmt = $pdo->prepare("SELECT id, title, status FROM tenders WHERE id = ?");
$stmt->execute([$id]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}
if (!in_array($tender['status'], ['published', 'draft'], true)) {
    jsonError('Tender cannot be closed', 400);
}

$stmt = $pdo->prepare("UPDATE tenders SET status = 'closed' WHERE id = ?");
$stmt->execute([$id]);
auditLog($pdo, $user['user_id'], 'tender_closed', 'tenders', $id, $tender['title']);
jsonSuccess(['message' => 'Tender closed']);