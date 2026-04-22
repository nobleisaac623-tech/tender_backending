<?php
/**
 * POST /api/bids/submit — Supplier submit bid (or create/update draft).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';
require_once dirname(dirname(__DIR__)) . '/helpers/mailer.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireSupplier();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$tenderId = isset($body['tender_id']) ? (int) $body['tender_id'] : 0;
if ($tenderId <= 0) {
    jsonError('Invalid tender ID', 400);
}

$stmt = $pdo->prepare("SELECT id, status, submission_deadline FROM tenders WHERE id = ?");
$stmt->execute([$tenderId]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}
if ($tender['status'] !== 'published') {
    jsonError('Tender is not open for bids', 400);
}
if (strtotime($tender['submission_deadline']) < time()) {
    jsonError('Submission deadline has passed', 400);
}

$stmt = $pdo->prepare("SELECT 1 FROM supplier_profiles WHERE user_id = ? AND is_approved = 1");
$stmt->execute([$user['user_id']]);
if (!$stmt->fetch()) {
    jsonError('Supplier account must be approved to submit bids', 403);
}

require_once dirname(dirname(__DIR__)) . '/helpers/blacklist.php';
if (isSupplierBlacklisted($pdo, (int) $user['user_id'])) {
    jsonError('You are not permitted to submit bids.', 403);
}

$bidAmount = isset($body['bid_amount']) && is_numeric($body['bid_amount']) ? (float) $body['bid_amount'] : null;
$technicalProposal = sanitizeString($body['technical_proposal'] ?? null, 50000);
$deliveryTime = sanitizeString($body['delivery_time'] ?? null, 100);
$submit = !empty($body['submit']);

$stmt = $pdo->prepare("SELECT id, status FROM bids WHERE tender_id = ? AND supplier_id = ?");
$stmt->execute([$tenderId, $user['user_id']]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    if ($existing['status'] === 'submitted') {
        jsonError('Bid already submitted', 400);
    }
    $stmt = $pdo->prepare("UPDATE bids SET bid_amount = ?, technical_proposal = ?, delivery_time = ?, status = ?, submitted_at = ? WHERE id = ?");
    $submittedAt = $submit ? date('Y-m-d H:i:s') : null;
    $status = $submit ? 'submitted' : 'draft';
    $stmt->execute([$bidAmount, $technicalProposal ?: null, $deliveryTime ?: null, $status, $submittedAt, $existing['id']]);
    $bidId = (int) $existing['id'];
} else {
    $submittedAt = $submit ? date('Y-m-d H:i:s') : null;
    $status = $submit ? 'submitted' : 'draft';
    $stmt = $pdo->prepare("INSERT INTO bids (tender_id, supplier_id, bid_amount, technical_proposal, delivery_time, status, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([$tenderId, $user['user_id'], $bidAmount, $technicalProposal ?: null, $deliveryTime ?: null, $status, $submittedAt]);
    $bidId = (int) $pdo->lastInsertId();
}

if ($submit) {
    auditLog($pdo, $user['user_id'], 'bid_submitted', 'bids', $bidId, "Tender $tenderId");
    notifyAdmin('New bid submitted', "A bid has been submitted for tender ID $tenderId by supplier " . $user['name']);
}

jsonSuccess(['id' => $bidId, 'status' => $submit ? 'submitted' : 'draft', 'message' => $submit ? 'Bid submitted' : 'Bid saved as draft']);