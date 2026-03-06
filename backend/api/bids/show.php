<?php
/**
 * GET /api/bids/show?id=1 — Single bid with documents. Permission by role.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    jsonError('Method not allowed', 405);
}

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid bid ID', 400);
}

$user = requireAuth();
$pdo = $GLOBALS['pdo'];

$stmt = $pdo->prepare("
    SELECT b.*, t.title AS tender_title, t.reference_number, t.status AS tender_status
    FROM bids b
    JOIN tenders t ON t.id = b.tender_id
    WHERE b.id = ?
");
$stmt->execute([$id]);
$bid = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$bid) {
    jsonError('Bid not found', 404);
}

$bid['tender_id'] = (int) $bid['tender_id'];
$bid['supplier_id'] = (int) $bid['supplier_id'];
if ($bid['bid_amount'] !== null) $bid['bid_amount'] = (float) $bid['bid_amount'];

if ($user['role'] === 'supplier' && (int) $bid['supplier_id'] !== $user['user_id']) {
    jsonError('Forbidden', 403);
}
if ($user['role'] === 'evaluator') {
    $stmt = $pdo->prepare("SELECT 1 FROM tender_evaluators WHERE tender_id = ? AND evaluator_id = ?");
    $stmt->execute([$bid['tender_id'], $user['user_id']]);
    if (!$stmt->fetch()) {
        jsonError('Forbidden', 403);
    }
}

$stmt = $pdo->prepare("SELECT id, filename, original_name, document_type, file_size, uploaded_at FROM bid_documents WHERE bid_id = ?");
$stmt->execute([$id]);
$bid['documents'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

jsonSuccess($bid);