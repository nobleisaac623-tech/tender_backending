<?php
/**
 * PUT /api/bids/update — Supplier update draft bid before deadline.
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'PATCH') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireSupplier();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$id = isset($body['id']) ? (int) $body['id'] : 0;
if ($id <= 0) {
    jsonError('Invalid bid ID', 400);
}

$stmt = $pdo->prepare("SELECT b.id, b.status, b.tender_id, t.submission_deadline, t.status AS tender_status FROM bids b JOIN tenders t ON t.id = b.tender_id WHERE b.id = ? AND b.supplier_id = ?");
$stmt->execute([$id, $user['user_id']]);
$bid = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$bid) {
    jsonError('Bid not found', 404);
}
if ($bid['status'] !== 'draft') {
    jsonError('Only draft bids can be updated', 400);
}
if (strtotime($bid['submission_deadline']) < time()) {
    jsonError('Submission deadline has passed', 400);
}

$bidAmount = isset($body['bid_amount']) && is_numeric($body['bid_amount']) ? (float) $body['bid_amount'] : null;
$technicalProposal = sanitizeString($body['technical_proposal'] ?? null, 50000);

$stmt = $pdo->prepare("UPDATE bids SET bid_amount = ?, technical_proposal = ? WHERE id = ?");
$stmt->execute([$bidAmount, $technicalProposal ?: null, $id]);
jsonSuccess(['message' => 'Bid updated']);