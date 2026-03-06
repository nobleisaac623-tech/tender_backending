<?php
/**
 * POST /api/tenders/award — Admin: award tender to a bid (sets tender status to awarded, bid to accepted).
 */

declare(strict_types=1);

require_once dirname(__DIR__) . '/bootstrap.php';
require_once dirname(dirname(__DIR__)) . '/config/auth-middleware.php';
require_once dirname(dirname(__DIR__)) . '/helpers/validate.php';
require_once dirname(dirname(__DIR__)) . '/helpers/audit.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError('Method not allowed', 405);
}

$user = requireAuth();
requireAdmin();
$pdo = $GLOBALS['pdo'];
$body = getJsonBody();

$tenderId = isset($body['tender_id']) ? (int) $body['tender_id'] : 0;
$bidId = isset($body['bid_id']) ? (int) $body['bid_id'] : 0;

if ($tenderId <= 0 || $bidId <= 0) {
    jsonError('tender_id and bid_id required', 400);
}

$stmt = $pdo->prepare("SELECT id, title, status FROM tenders WHERE id = ?");
$stmt->execute([$tenderId]);
$tender = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$tender) {
    jsonError('Tender not found', 404);
}
if (!in_array($tender['status'], ['evaluated', 'awarded'], true)) {
    jsonError('Tender must be evaluated before awarding', 400);
}

$stmt = $pdo->prepare("SELECT id, supplier_id FROM bids WHERE id = ? AND tender_id = ? AND status IN ('submitted', 'accepted')");
$stmt->execute([$bidId, $tenderId]);
$bid = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$bid) {
    jsonError('Bid not found or invalid for this tender', 404);
}

$pdo->beginTransaction();
try {
    $stmt = $pdo->prepare("UPDATE bids SET status = 'rejected' WHERE tender_id = ? AND id != ?");
    $stmt->execute([$tenderId, $bidId]);
    $stmt = $pdo->prepare("UPDATE bids SET status = 'accepted' WHERE id = ?");
    $stmt->execute([$bidId]);
    $stmt = $pdo->prepare("UPDATE tenders SET status = 'awarded' WHERE id = ?");
    $stmt->execute([$tenderId]);
    $pdo->commit();
} catch (Exception $e) {
    $pdo->rollBack();
    throw $e;
}

auditLog($pdo, $user['user_id'], 'tender_awarded', 'tenders', $tenderId, 'Bid #' . $bidId . ' accepted');
jsonSuccess(['message' => 'Tender awarded', 'supplier_id' => (int) $bid['supplier_id']]);
